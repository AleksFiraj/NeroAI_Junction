# Nero AI AI

Explainable, trigger-based electricity-theft detection for **Tirana, Albania**. Nero AI
generates a realistic synthetic dataset of metered electricity connections, learns
normal consumption behavior per customer, and detects non-technical losses (meter
tampering, illegal connections, seasonal manipulation, neighborhood anomalies, gradual
theft) using a hybrid of statistical triggers and an Isolation Forest, producing an
explainable 0-100 risk score.

## Stack

- Backend: Python, FastAPI, SQLite, Pandas, NumPy, scikit-learn (Isolation Forest)
- Frontend: React (Vite + TypeScript), TailwindCSS, Recharts, Leaflet, React Query, Framer Motion
- Runtime artifacts: `data/nero.db`, `models/isolation_forest.joblib`

## Backend architecture (`backend/app`)

- `utils/` - Tirana districts + coordinates, monthly temperatures, behavior archetypes
- `dataset/` - synthetic dataset generation + 5-type fraud injection
- `features/` - ~25 engineered features across personal, seasonal, peer, geographic and load-shape groups
- `triggers/` - **Trigger Registry System**: 6 groups, 17 triggers, each emitting a structured output
- `risk_engine/` - group fusion with a multi-group agreement gate
- `ml/` - Isolation Forest trained on engineered features only (+ optional PCA reconstruction hook)
- `explainability/` - deterministic trigger->text reasons + narration-only LLM wrapper
- `services/` - end-to-end analysis pipeline orchestration
- `api/` - all REST endpoints; `db/`, `schemas/` - persistence and response models

## Tirana dataset

- ~1000 customers across 10 districts: Tiranë Center, Blloku, Laprakë, Kombinat,
  Kinostudio, Yzberisht, Fresku, Astir, Ali Demi, Sauk.
- 4 behavior archetypes with realistic winter/summer kWh bands: Young Family,
  Single Professional, Retired Couple, Small Business.
- 24 months per customer driven by the canonical Tirana monthly temperatures
  (Jan 5 deg C ... Jul/Aug 28 deg C ... Dec 7 deg C).
- Customers cluster into shared buildings and transformers for clean peer comparison.
- Fraud injected into 10% of customers across all 5 patterns.

## Trigger Registry System

Each trigger emits: `{ trigger_name, group, score, threshold, evidence_window, features_used, reason }`.

| Group | Triggers |
| --- | --- |
| Self-Behavior | sudden_drop, low_usage_persistence, volatility_anomaly |
| Seasonal | winter_underconsumption, seasonal_inconsistency, temperature_mismatch |
| Peer Comparison | peer_deviation, building_outlier, z_score_anomaly |
| Geographic | district_outlier, hotspot_cluster, neighborhood_divergence |
| Meter Integrity | flatline_usage, repeated_values, abnormal_stability |
| Load Shape | consumption_shape_distance, historical_pattern_break |

## Risk engine

Risk score (0-100) fuses four weighted components built from the trigger groups:

- 30% Self-Behavior (+ Meter Integrity, with the Isolation Forest as a capped corroborating signal)
- 25% Seasonal
- 25% Peer Comparison
- 20% Geographic + Load Shape

A **multi-group agreement gate** strongly dampens the score unless several independent
trigger groups concur, so no single trigger or group can dominate. Each customer's
headline risk is the mean of its top-3 risk months over the last 12 months (sustained
anomaly), with the peak month supplying the trigger evidence. Status: Normal /
Suspicious (>= 38) / Critical (>= 65).

## Frontend pages

- **Dashboard** - KPIs (customers, high-risk, estimated losses, anomalies), top-10
  high-risk customers, risk-distribution donut, and risk-by-district bars.
- **Heatmap** - an animated 3D globe (`cobe`) zooms into Tirana, then cross-fades into a
  Leaflet risk map of flagged customers. Clicking a marker opens a focus card (blurred
  backdrop) with the risk score and reason, plus an "Investigate with AI" Gemini chat.
- **Customers** - searchable grid of customer cards; the detail view shows the profile,
  an AI summary, a risk gauge with a hover breakdown (Personal/Seasonal/Peer/Geographic,
  for risk > 60), a consumption chart with anomaly months highlighted, and the trigger
  explainability checklist.
- **Inspector** - the admin queue of open high-risk cases: review a profile, mark it
  Fraud/Resolved (removes it from the queue), read AI note cards, add a next-month
  reading for one customer, or advance the whole dataset by a month - both retrain the ML.

## AI assistant (Gemini, strict)

The AI may ONLY narrate / answer questions about the computed Nero AI analysis data. It
never computes risk, detects anomalies, or influences scoring. A strict factual context
is built from the database and the model is instructed not to invent facts. Set
`GEMINI_API_KEY` in `backend/.env` to enable real Gemini; otherwise a deterministic,
data-grounded fallback is used.

## Quick Start

### 1) Install dependencies

```bash
python -m pip install --user -r requirements.txt
cd frontend && npm install
```

### 2) (Optional) configure AI

Copy `backend/.env.example` to `backend/.env` and set `GEMINI_API_KEY` to enable the
Gemini investigation assistant.

### 3) Start backend (from repo root)

```bash
python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload
```

On first boot the backend generates the Tirana dataset once, trains the model, and runs
the analysis automatically (this takes ~40s). Afterwards it keeps using that data.

Backend URL: `http://localhost:8000`

### 4) Start frontend

```bash
cd frontend && npm run dev
```

Frontend URL: `http://localhost:5173`

### Open on other devices (same Wi‑Fi / LAN)

1. Start backend and frontend as above.
2. In the frontend terminal, Vite prints a **Network** URL (e.g. `http://192.168.1.42:5173`).
3. On your phone or another PC, open that Network URL in the browser.

The dev server binds to all interfaces (`host: true`) and proxies API calls to the backend, so other devices only need port **5173** open on your machine. Ensure Windows Firewall allows incoming connections on that port if prompted.

To use a custom backend port when proxying, set `VITE_API_PROXY_TARGET=http://127.0.0.1:8000` in `frontend/.env`.

## API Endpoints

- `GET /customers`, `GET /customer/{id}`, `GET /risk/{id}`
- `GET /dashboard`, `GET /heatmap`
- `POST /generate-dataset`, `POST /train-model`, `POST /analyze`
- `POST /ai/chat`, `GET /ai/summary/{id}` (Gemini-grounded; `POST /ai-explanation` kept for back-compat)
- `POST /consumption/{id}` (add a reading), `POST /advance-month` (bulk) - both retrain
- `POST /customer/{id}/review` (mark fraud / resolved / open)

## Validation

A smoke check runs the full flow and asserts every endpoint:

```bash
cd backend && python tests/smoke_check.py
```

On a 1000-customer / 24-month dataset the system detects roughly 99% of injected fraud
customers (>90% target) at a low false-positive rate, with explanations that match the
fired triggers exactly.
