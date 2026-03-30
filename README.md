# DSA4262 Project

This project repository is for Group 8.

## Team Members
This project has 6 members:
- Ho Hoi Kay Robyn
- Inaz Begum
- Lim Zhi Chao
- Ng RouAnne
- Nguyen Anh Quan
- Ong Xiu Min

## Project Overview

A mobile app intervention for elderly users that tracks behavioural cues and mental wellness through surveys and journaling. The collected data is fed into a combined ML model (behavioural features + NLP embeddings) to predict loneliness levels. A separate admin dashboard allows caregivers to screen patients for loneliness risk.

## Repository Structure

```
dsa4262/
├── demo/
│   ├── src/                      # Elderly app (React + Vite, port 5173)
│   │   ├── pages/                # Onboarding, Home, Survey, Journal, History
│   │   ├── components/           # Layout, navigation
│   │   ├── lib/                  # Supabase client
│   │   └── types/                # TypeScript interfaces
│   ├── admin/                    # Admin/caregiver app (React + Vite, port 5174)
│   │   └── src/pages/            # Dashboard with screening
│   ├── backend/                  # FastAPI API (port 8000)
│   │   └── main.py               # Write endpoints + screening inference
│   └── db/
│       └── schema.sql            # Supabase table definitions
├── model/
│   ├── notebooks/
│   │   └── combined.ipynb        # Combined model (behavioural + NLP)
│   └── artifacts/                # Exported model files (after training)
└── cosowell_data.zip             # COSOWELL dataset
```

## Getting Started

### Prerequisites

- Python 3.12+ with pip
- [Node.js](https://nodejs.org/) (v18+)


### 1. Dataset Setup

Download `cosowell_data.zip` and place it at the repository root (`dsa4262/cosowell_data.zip`).

### 2. Python Environment Setup

Install uv (fast Python package manager):

```bash
pip install uv
```

Create a `.venv` and install all Python dependencies from `pyproject.toml`:
```bash
uv sync
```

### 3. Environment Variables

Paste the `.env` file in the project root (`dsa4262/.env`).

### 4. Install Frontend Dependencies

```bash
# Elderly app
cd demo && npm install

# Admin app
cd demo/admin && npm install
```

### 5. Run the Demo

Open three terminals:

```bash
# Terminal 1: Elderly app (port 5173)
cd demo && npm run dev

# Terminal 2: Admin app (port 5174)
cd demo/admin && npm run dev

# Terminal 3: Backend API (port 8000)
cd demo/backend && uv run uvicorn main:app --reload --port 8000

```

### 6. Demo Flow

1. Open the elderly app at `http://localhost:5173` and complete the onboarding profile
2. Fill in the wellness survey and write a journal entry
3. Switch to the admin app at `http://localhost:5174`
4. Click **Run Screening** to see flagged at-risk patients with confidence scores

### 7. Model Training (Optional)

1. Ensure `cosowell_data.zip` is at the project root (see step 1)
2. Open `model/notebooks/combined.ipynb` in Jupyter
3. Run all cells
4. The final trained model exports to `model/artifacts/`

## Dataset to Model to App Feature Mapping

### Behavioural Features (Collected on Profile Setup)

| COSOWELL Column | Description | Model Feature Type | App Collection |
|---|---|---|---|
| `age` | Participant's age | Numeric | Profile setup |
| `gender` | Gender identity | Categorical (one-hot) | Profile setup |
| `education` | Education level | Categorical (one-hot) | Profile setup |
| `years_education` | Total years of education | Numeric | Profile setup |
| `read_ability` | Self-rated reading ability | Categorical (one-hot) | Profile setup |
| `write_ability` | Self-rated writing ability | Categorical (one-hot) | Profile setup |
| `retired` | Retirement status | Categorical (one-hot) | Profile setup |
| `employed` | Employment status | Categorical (one-hot) | Profile setup |
| `volunteer` | Volunteering status | Categorical (one-hot) | Profile setup |
| `health` | Self-rated health | Categorical (one-hot) | Profile setup |
| `learning_disability` | Has learning disability | Categorical (one-hot) | Profile setup |
| `living_arrangements` | Living situation | Categorical (one-hot) | Profile setup |
| `residency` | Area type (urban/suburban/rural) | Categorical (one-hot) | Profile setup |
| `num_friends` | Number of close friends | Numeric | Profile setup |
| `num_household` | Number in household | Numeric | Profile setup |

### Behavioural Features (Collected Periodically via Survey)

| COSOWELL Column | Description | Model Feature Type | App Collection |
|---|---|---|---|
| `speak_habit` | Hours/week speaking with others | Numeric | Recurring survey |
| `read_print_habit` | Hours/week reading print media | Numeric | Recurring survey |
| `read_web_habit` | Hours/week reading online | Numeric | Recurring survey |
| `broadcast_habit` | Hours/week watching TV/radio | Numeric | Recurring survey |
| `social_meet_freq` | How often meet friends socially | Categorical (one-hot) | Recurring survey |
| `professional_meet_freq` | How often attend professional meetings | Categorical (one-hot) | Recurring survey |
| `volunteer_meet_freq` | How often do volunteer activities | Categorical (one-hot) | Recurring survey |
| `talk_social_network` | How often use social media/messaging | Categorical (one-hot) | Recurring survey |
| `divulge_family` | How often share personal matters with family | Categorical (one-hot) | Recurring survey |
| `rely_family` | How often rely on family for help | Categorical (one-hot) | Recurring survey |
| `divulge_friend` | How often share personal matters with friends | Categorical (one-hot) | Recurring survey |
| `rely_friend` | How often rely on friends for help | Categorical (one-hot) | Recurring survey |
| `divulge_spouse` | How often share personal matters with spouse | Categorical (one-hot) | Recurring survey |
| `rely_spouse` | How often rely on spouse for help | Categorical (one-hot) | Recurring survey |

### NLP Features

| COSOWELL Column | Description | Model Feature Type | App Collection |
|---|---|---|---|
| `narrative` | Free-text story/narrative | 384-dim embedding via `all-MiniLM-L6-v2` | Daily journal (text or voice) |

### Dropped Columns (not used in model)

| Column(s) | Reason |
|---|---|
| `id`, `test_session` | Identifiers, not predictive |
| `companion`, `leftout`, `isolated` | **Target leakage**, these sum to the `loneliness` score |
| `loneliness` | Raw target variable (binned into low/moderate/high) |
| `well_being_score`, `flourish1-8_num` | Only in sessions 7-8, mostly NA |
| `cognitive_reappraisal`, `expressive_suppression`, `reg1-10_num` | Only in sessions 7-8, mostly NA |
| `education2` | Redundant, coarser grouping of `education` |
| `age_education` | Redundant, derivable from `age` + `years_education` |
| `confide_spouse/family/friend/colleague` | Redundant, overlaps with `divulge_*` / `rely_*` columns |
| `phase` | Dataset artifact (pre-COVID vs COVID), not a patient feature |
| `country`, `state_province` | High-cardinality geographic features that creates sparse dummies, unlikely to generalise |

### Target Variable

| Output | Values | Derived From |
|---|---|---|
| `loneliness_level` | **low** (3-4), **moderate** (5-6), **high** (7-9) | Binned from `loneliness` score |