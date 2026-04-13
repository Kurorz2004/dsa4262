"""
FastAPI backend for GoldHaven loneliness screening.

Loads the trained RF model + scaler from model/artifacts/ and exposes
an endpoint for the admin app to screen patients.
"""

import os
import joblib
import numpy as np
import pandas as pd
import shap
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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

st_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

LABEL_MAP = {1: 'low', 2: 'moderate', 3: 'high'}

# ---------------------------------------------------------------------------
# SHAP explainer (computed once at startup)
# ---------------------------------------------------------------------------
explainer = shap.TreeExplainer(model)

# Readable names for one-hot encoded features
def _readable_feature(name: str) -> str:
    """Convert feature column names to human-readable labels.

    One-hot encoded features look like 'rely_family_often', 'health_good', etc.
    We map the full name to a specific, descriptive label.
    """
    # Exact matches for base numeric features
    exact = {
        'age': 'Age',
        'years_education': 'Years of Education',
        'num_friends': 'Number of Close Friends',
        'num_household': 'Household Size',
        'speak_habit': 'Speaking Habit (hrs/wk)',
        'read_print_habit': 'Reading Print (hrs/wk)',
        'read_web_habit': 'Reading Online (hrs/wk)',
        'broadcast_habit': 'TV/Radio (hrs/wk)',
    }
    if name in exact:
        return exact[name]

    # Specific mappings for one-hot encoded features
    specific = {
        # Reliance — who and how often
        'rely_family': 'Rely on Family',
        'rely_friend': 'Rely on Friends',
        'rely_spouse': 'Rely on Spouse',
        'divulge_family': 'Share with Family',
        'divulge_friend': 'Share with Friends',
        'divulge_spouse': 'Share with Spouse',
        # Social frequency
        'social_meet_freq': 'Social Meetup Freq.',
        'professional_meet_freq': 'Professional Meetup Freq.',
        'volunteer_meet_freq': 'Volunteer Activity Freq.',
        'talk_social_network': 'Social Media Use',
        # Profile
        'gender': 'Gender',
        'education': 'Education',
        'read_ability': 'Reading Ability',
        'write_ability': 'Writing Ability',
        'health': 'Health',
        'living_arrangements': 'Living Arrangements',
        'learning_disability': 'Learning Disability',
        'retired': 'Retired',
        'employed': 'Employed',
        'volunteer': 'Volunteering',
    }

    # Match longest prefix first (e.g. 'rely_family' before 'rely')
    for prefix in sorted(specific, key=len, reverse=True):
        if name.startswith(prefix):
            # Extract the value part after the prefix (e.g. 'often' from 'rely_family_often')
            suffix = name[len(prefix):]
            if suffix.startswith('_'):
                suffix = suffix[1:]
            base = specific[prefix]
            if suffix:
                val = suffix.replace('_', ' ')
                return f"{base} = {val}"
            return base

    return name.replace('_', ' ').title()



def _get_patient_shap(features: pd.DataFrame, raw_features: pd.DataFrame, n: int = 5) -> list[dict]:
    """Return top N SHAP-based contributing features for a single patient.

    Always uses SHAP values for the HIGH-risk class (label 3, index 2)
    so that positive = increases loneliness risk, negative = decreases risk,
    regardless of which class was predicted.

    Only considers features where the patient has a non-zero raw value,
    so we never show e.g. "Rely on Spouse = often" when the patient answered "never".
    """
    HIGH_RISK_IDX = 2  # class label 3 → index 2

    sv = explainer.shap_values(features)

    # Handle different shap return formats:
    # - List of arrays (one per class): sv[class_idx][sample_idx]
    # - Single 3D array: sv[sample_idx, feature_idx, class_idx]
    if isinstance(sv, list):
        class_shap = np.array(sv[HIGH_RISK_IDX]).flatten()
    elif isinstance(sv, np.ndarray) and sv.ndim == 3:
        class_shap = sv[0, :, HIGH_RISK_IDX]
    else:
        # Fallback: flatten whatever we get
        class_shap = np.array(sv).flatten()

    raw_vals = raw_features.iloc[0]

    # Only consider behavioural features that the patient actually has (non-zero raw value)
    behav_indices = [i for i, c in enumerate(feature_columns)
                     if not c.startswith('emb_') and raw_vals.iloc[i] != 0]
    shap_pairs = [(feature_columns[i], class_shap[i]) for i in behav_indices]
    # Sort by absolute SHAP value (most impactful first)
    shap_pairs.sort(key=lambda x: abs(x[1]), reverse=True)

    result = []
    for feat, val in shap_pairs[:n]:
        label = _readable_feature(feat)
        result.append({
            'feature': feat,
            'label': label,
            'shap_value': round(float(val), 4),
            'direction': 'increases risk' if val > 0 else 'decreases risk',
        })
    return result

# ---------------------------------------------------------------------------
# Supabase client
# ---------------------------------------------------------------------------
sb = create_client(SUPABASE_URL, SUPABASE_KEY)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title='GoldHaven Screening API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
)


def build_feature_vector(patient: dict, survey: dict, narrative: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Combine patient profile + survey answers + narrative embedding
    into a single feature row matching the training feature columns.

    Returns (scaled_features, raw_features) — both aligned to training columns.
    raw_features is needed to know which one-hot features the patient actually has.
    """
    # --- Behavioural features ---
    row = {}
    # Profile fields (must match training features — excludes dropped columns
    # like education2, age_education, confide_*, phase, country, state_province)
    # NOTE: 'residency' is stored in DB but excluded from inference —
    # the model was trained on urban/suburban/rural which doesn't align
    # with the current Singapore region values. Will be re-included
    # after retraining.
    for col in ['age', 'gender', 'education', 'years_education',
                'read_ability', 'write_ability', 'retired', 'employed',
                'volunteer', 'health', 'learning_disability',
                'living_arrangements', 'num_friends', 'num_household']:
        row[col] = patient.get(col)

    # Survey fields
    for col in ['speak_habit', 'read_print_habit', 'read_web_habit',
                'broadcast_habit', 'social_meet_freq', 'professional_meet_freq',
                'volunteer_meet_freq', 'talk_social_network',
                'divulge_family', 'rely_family', 'divulge_friend', 'rely_friend',
                'divulge_spouse', 'rely_spouse']:
        row[col] = survey.get(col)

    behav_df = pd.DataFrame([row])
    behav_df = pd.get_dummies(behav_df)

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

    # Keep raw (unscaled) copy for SHAP factor filtering
    raw = combined.copy()

    # Scale
    scaled = pd.DataFrame(
        scaler.transform(combined),
        columns=feature_columns,
    )

    return scaled, raw


@app.get('/patients')
def list_patients():
    """List all patients."""
    res = sb.table('patients').select('*').order('created_at', desc=True).execute()
    return res.data


@app.get('/patients/{patient_id}/surveys')
def get_patient_surveys(patient_id: str):
    """Get all surveys for a specific patient, newest first."""
    res = sb.table('surveys').select('*').eq('from_user_id', patient_id).order('created_at', desc=True).execute()
    return res.data


@app.get('/patients/{patient_id}/details')
def get_patient_details(patient_id: str):
    """Get a single patient's full profile."""
    res = sb.table('patients').select('*').eq('id', patient_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail='Patient not found')
    return res.data[0]


@app.get('/patients/lookup')
def lookup_patient(name: str):
    """Look up a patient by exact name (case-insensitive)."""
    res = sb.table('patients').select('*').ilike('name', name.strip()).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail='No patient found with that name')
    return res.data[0]


@app.post('/patients')
def create_patient(payload: dict):
    """Create a new patient profile."""
    res = sb.table('patients').insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail='Failed to create patient')
    return res.data[0]


@app.post('/surveys')
def create_survey(payload: dict):
    """Save a survey response."""
    res = sb.table('surveys').insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail='Failed to save survey')
    return res.data[0]


@app.post('/journals')
def create_journal(payload: dict):
    """Save a journal entry."""
    res = sb.table('journal_entries').insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail='Failed to save journal entry')
    return res.data[0]


@app.get('/dashboard')
def dashboard_data():
    """
    Single endpoint for the admin dashboard.
    Returns all patients with their surveys and screening result.
    Auto-screens patients that have sufficient data.
    """
    patients = sb.table('patients').select('*').order('created_at', desc=True).execute().data
    surveys = sb.table('surveys').select('*').order('created_at', desc=True).execute().data
    journals = sb.table('journal_entries').select('*').order('created_at', desc=True).execute().data

    # Group surveys and journals by patient
    surveys_by_patient: dict[str, list] = {}
    for s in surveys:
        uid = s['from_user_id']
        surveys_by_patient.setdefault(uid, []).append(s)

    journals_by_patient: dict[str, list] = {}
    for j in journals:
        uid = j['from_user_id']
        journals_by_patient.setdefault(uid, []).append(j)

    result = []
    for patient in patients:
        pid = patient['id']
        p_surveys = surveys_by_patient.get(pid, [])
        p_journals = journals_by_patient.get(pid, [])

        # Screen if patient has at least one survey and one journal
        screening = None
        if p_surveys and p_journals:
            latest_survey = p_surveys[0]
            latest_journal = p_journals[0]
            try:
                features, raw_features = build_feature_vector(patient, latest_survey, latest_journal['content'])
                pred_label = int(model.predict(features)[0])
                pred_proba = model.predict_proba(features)[0]
                screening = {
                    'predicted_level': LABEL_MAP[pred_label],
                    'predicted_label': pred_label,
                    'confidence': float(np.max(pred_proba)),
                    'probabilities': {
                        'low': float(pred_proba[0]),
                        'moderate': float(pred_proba[1]),
                        'high': float(pred_proba[2]),
                    },
                    'top_factors': [],
                }
                # SHAP computation (separate try so screening still works if SHAP fails)
                try:
                    screening['top_factors'] = _get_patient_shap(features, raw_features)
                except Exception as e:
                    print(f"SHAP error for patient {pid}: {e}")
            except Exception as e:
                print(f"Screening error for patient {pid}: {e}")

        result.append({
            'patient': patient,
            'surveys': p_surveys,
            'screening': screening,
        })

    return {
        'patients': result,
    }
