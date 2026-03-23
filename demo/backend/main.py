"""
FastAPI backend for MindWell loneliness screening.

Loads the trained RF model + scaler from model/artifacts/ and exposes
an endpoint for the admin app to screen patients.
"""

import os
import joblib
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from supabase import create_client

# ---------------------------------------------------------------------------
# Config — loads from root .env
# ---------------------------------------------------------------------------
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'model', 'artifacts')
SUPABASE_URL = os.environ.get('VITE_SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('VITE_SUPABASE_ANON_KEY', '')

# ---------------------------------------------------------------------------
# Load model artifacts at startup
# ---------------------------------------------------------------------------
model = joblib.load(os.path.join(ARTIFACTS_DIR, 'combined_rf_model.joblib'))
scaler = joblib.load(os.path.join(ARTIFACTS_DIR, 'scaler.joblib'))
feature_columns = joblib.load(os.path.join(ARTIFACTS_DIR, 'feature_columns.joblib'))

st_model = SentenceTransformer('all-MiniLM-L6-v2')

LABEL_MAP = {1: 'low', 2: 'moderate', 3: 'high'}

# ---------------------------------------------------------------------------
# Supabase client
# ---------------------------------------------------------------------------
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title='MindWell Screening API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)


def build_feature_vector(patient: dict, survey: dict, narrative: str) -> pd.DataFrame:
    """
    Combine patient profile + survey answers + narrative embedding
    into a single feature row matching the training feature columns.
    """
    # --- Behavioural features ---
    row = {}
    # Profile fields (must match training features — excludes dropped columns
    # like education2, age_education, confide_*, phase, country, state_province)
    for col in ['age', 'gender', 'education', 'years_education',
                'read_ability', 'write_ability', 'retired', 'employed',
                'volunteer', 'health', 'learning_disability',
                'living_arrangements', 'residency', 'num_friends', 'num_household']:
        row[col] = patient.get(col)

    # Survey fields
    for col in ['speak_habit', 'read_print_habit', 'read_web_habit',
                'broadcast_habit', 'social_meet_freq', 'professional_meet_freq',
                'volunteer_meet_freq', 'talk_social_network',
                'divulge_family', 'rely_family', 'divulge_friend', 'rely_friend',
                'divulge_spouse', 'rely_spouse']:
        row[col] = survey.get(col)

    behav_df = pd.DataFrame([row])
    behav_df = pd.get_dummies(behav_df, drop_first=True)

    # --- NLP embedding ---
    embedding = st_model.encode([narrative])[0]
    emb_cols = [f'emb_{i}' for i in range(len(embedding))]
    emb_df = pd.DataFrame([embedding], columns=emb_cols)

    # --- Combine and align to training columns ---
    combined = pd.concat([behav_df, emb_df], axis=1)

    # Ensure all training columns are present (fill missing dummies with 0)
    for col in feature_columns:
        if col not in combined.columns:
            combined[col] = 0
    combined = combined[feature_columns]

    # Scale
    combined = pd.DataFrame(
        scaler.transform(combined),
        columns=feature_columns,
    )

    return combined


class ScreenResult(BaseModel):
    patient_id: str
    patient_name: str
    predicted_level: str
    predicted_label: int
    confidence: float
    probabilities: dict


class ScreenAllResponse(BaseModel):
    results: list[ScreenResult]
    screened: int
    skipped: int


@app.get('/patients')
def list_patients():
    """List all patients."""
    res = sb.table('patients').select('*').order('created_at', desc=True).execute()
    return res.data


@app.post('/screen', response_model=ScreenAllResponse)
def screen_all_patients():
    """
    Screen all patients who have at least one survey and one journal entry.
    Uses the most recent survey and journal entry per patient.
    """
    patients = sb.table('patients').select('*').execute().data
    surveys = sb.table('surveys').select('*').order('created_at', desc=True).execute().data
    journals = sb.table('journal_entries').select('*').order('created_at', desc=True).execute().data

    # Index latest survey and journal per patient
    latest_survey: dict = {}
    for s in surveys:
        uid = s['from_user_id']
        if uid not in latest_survey:
            latest_survey[uid] = s

    latest_journal: dict = {}
    for j in journals:
        uid = j['from_user_id']
        if uid not in latest_journal:
            latest_journal[uid] = j

    results = []
    skipped = 0

    for patient in patients:
        pid = patient['id']
        survey = latest_survey.get(pid)
        journal = latest_journal.get(pid)

        if not survey or not journal:
            skipped += 1
            continue

        narrative = journal['content']
        features = build_feature_vector(patient, survey, narrative)

        pred_label = int(model.predict(features)[0])
        pred_proba = model.predict_proba(features)[0]

        pred_level = LABEL_MAP[pred_label]
        confidence = float(np.max(pred_proba))
        probabilities = {
            'low': float(pred_proba[0]),
            'moderate': float(pred_proba[1]),
            'high': float(pred_proba[2]),
        }

        # Save screening result
        sb.table('screenings').insert({
            'patient_id': pid,
            'survey_id': survey['id'],
            'journal_id': journal['id'],
            'predicted_level': pred_level,
            'predicted_label': pred_label,
            'confidence': confidence,
            'probabilities': probabilities,
        }).execute()

        results.append(ScreenResult(
            patient_id=pid,
            patient_name=patient.get('name', 'Unknown'),
            predicted_level=pred_level,
            predicted_label=pred_label,
            confidence=confidence,
            probabilities=probabilities,
        ))

    # Sort: high risk first
    results.sort(key=lambda r: r.predicted_label, reverse=True)

    return ScreenAllResponse(
        results=results,
        screened=len(results),
        skipped=skipped,
    )


@app.get('/screenings')
def list_screenings():
    """List all past screening results."""
    res = sb.table('screenings').select('*, patients(name)').order('created_at', desc=True).execute()
    return res.data
