# AlertixAI — Identity Trust Framework

> **Continuous · Risk-Based · Privacy-Preserving**  
> A real-time identity trust framework for digital banking that detects account takeover, KYC fraud, and insider misuse — triggering step-up verification only when risk is elevated.

---

## Table of Contents

1. [What it does](#what-it-does)
2. [Architecture overview](#architecture-overview)
3. [Repository layout](#repository-layout)
4. [Quickstart](#quickstart)
5. [The four ML detectors](#the-four-ml-detectors)
6. [Score fusion & decision engine](#score-fusion--decision-engine)
7. [Privacy layer](#privacy-layer)
8. [FastAPI backend](#fastapi-backend)
9. [Frontend dashboard](#frontend-dashboard)
10. [Demo scenarios](#demo-scenarios)
11. [Compliance mapping](#compliance-mapping)
12. [Scalability](#scalability)
13. [Team & ownership](#team--ownership)

---

## What it does

AlertixAI evaluates every banking event (login, transaction, KYC onboarding, admin action)
in real time and routes it to one of three outcomes:

| Decision | Fused Risk Score | User Experience |
|---|---|---|
| **Allow** | < 0.35 | Invisible — no friction |
| **Step-up** | 0.35 – 0.70 | OTP / biometric / liveness check |
| **Block** | ≥ 0.70 | Access denied; analyst alerted |

Every decision is:
- **Explainable** — ranked SHAP reason codes tell the analyst exactly which signals drove the score
- **Audited** — written to a tamper-evident log with hashed PII (DPDP / RBI compliant)
- **Friction-optimised** — step-up is only triggered when the risk actually warrants it

---

## Architecture overview

```
Banking channel events
        │
        ▼
┌──────────────────┐     Kafka / Redis Streams
│  Event Ingestion │──────────────────────────────────┐
│ (ingestion/)     │                                  │
└──────────────────┘                                  ▼
                                          ┌──────────────────────┐
                                          │   Feature Store      │
                                          │ (Parquet, partitioned│
                                          │  by type + date)     │
                                          └──────────────────────┘
                                                      │
                                   ┌──────────────────┼──────────────────┐
                                   ▼                  ▼                  ▼
                          ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐
                          │ Behavioral  │   │ Device Trust │   │   KYC Fraud      │
                          │ Detector    │   │ GNN Detector │   │   Detector       │
                          │ (IF+AE)     │   │ (GraphSAGE)  │   │ (CatBoost+SHAP)  │
                          └─────────────┘   └──────────────┘   └──────────────────┘
                                   │                  │                  │
                                   └──────────────────┼──────────────────┘
                                                      │
                                          ┌───────────────────────┐
                                          │  Insider Misuse       │
                                          │  Detector             │
                                          │  (CohortIF + Rules)   │
                                          └───────────────────────┘
                                                      │
                                   ┌──────────────────┘
                                   ▼
                          ┌──────────────────────┐
                          │   Score Fusion       │
                          │ (Weighted Average /  │
                          │  Meta-Classifier)    │
                          └──────────────────────┘
                                   │
                                   ▼
                          ┌──────────────────────┐      ┌────────────────┐
                          │  Decision Engine     │─────▶│  Audit Log     │
                          │  allow/step_up/block │      │  (JSONL+hashed)│
                          └──────────────────────┘      └────────────────┘
                                   │
                          ┌────────┴────────┐
                          ▼                 ▼
                   Step-up Auth        Live Dashboard
                   (OTP/biometric/     (Next.js + SHAP
                    liveness)           reason codes)
```

---

## Repository layout

```
alertixAI/
│
├── ingestion/                  # Ratnesh — event ingestion
│   ├── event_generator.py      # synthetic event factory
│   ├── kafka_producer.py       # Kafka / Redis producer
│   ├── kafka_consumer.py       # consumer → feature store
│   └── schemas/
│       └── event_schema.json   # canonical event shape
│
├── feature_store/              # Ratnesh — Parquet feature store
│   ├── store.py                # write_batch(), read_all()
│   ├── audit_log/              # JSONL audit log (date-partitioned)
│   └── data/                   # auto-created on first write
│
├── ml/                         # Muskan — all ML
│   ├── interfaces/
│   │   ├── detector_base.py    # ★ frozen BaseDetector ABC (the handoff contract)
│   │   ├── model_schema.py     # DetectorScore, FusedScore Pydantic models
│   │   └── mock_detectors.py   # beta-variate mocks for pre-training dev
│   │
│   ├── behavioral/             # Isolation Forest + Autoencoder ensemble
│   │   ├── feature_engineering.py
│   │   ├── isolation_forest.py
│   │   ├── autoencoder.py      # optional: requires torch
│   │   └── train.py            # → BehavioralDetector
│   │
│   ├── device_trust/           # GraphSAGE/GAT link-prediction GNN
│   │   ├── graph_builder.py    # builds user-device-IP heterogeneous graph
│   │   ├── graphsage_gat.py    # GNN architecture
│   │   └── train.py            # → DeviceTrustDetector
│   │
│   ├── kyc_fraud/              # CatBoost + SHAP
│   │   ├── feature_engineering.py
│   │   ├── catboost_model.py
│   │   ├── shap_explainer.py
│   │   └── train.py            # → KYCFraudDetector
│   │
│   ├── insider_misuse/         # Per-cohort Isolation Forest + rule engine
│   │   ├── cohort_isolation_forest.py  # → CohortIsolationForestDetector
│   │   ├── rules.py            # InsiderMisuseRuleEngine (deterministic)
│   │   └── test_rules.py
│   │
│   ├── fusion/
│   │   ├── score_fusion.py     # WeightedAverageFusion + MetaClassifierFusion
│   │   └── reason_codes.py     # de-dup, rank, humanise reason codes
│   │
│   └── train_all.py            # trains all 4 detectors in sequence
│
├── backend/                    # Ratnesh — FastAPI orchestrator
│   ├── main.py                 # FastAPI app, router includes
│   ├── orchestrator/
│   │   ├── config.py           # thresholds + fusion weights (config-driven)
│   │   └── decision_engine.py  # fuse_scores(), decide(), build_decision()
│   ├── privacy/
│   │   ├── hashing.py          # salted HMAC-SHA256 PII hashing
│   │   ├── differential_privacy.py  # diffprivlib DP noise
│   │   └── audit_log.py        # JSONL audit writer
│   └── routers/
│       ├── score.py            # ★ /score, /score/{detector} — real models + mock fallback
│       ├── stepup_auth.py      # mock step-up verification endpoint
│       └── feed.py             # SSE live event feed (Rupali integration)
│
├── frontend/                   # Rupali — Next.js analyst dashboard
│   └── app/
│       ├── dashboard/          # main threat-monitor page
│       │   └── components/     # ScoreCard, SHAP, DeviceGraph, DrillDown, etc.
│       ├── stepup/             # fully-clickable step-up auth UI
│       ├── insider-misuse/     # insider threat view
│       ├── privacy-audit/      # audit log / compliance view
│       └── system-health/      # system health indicators
│
├── docs/
│   ├── scope_statement.md      # ★ what's built vs architected-only
│   ├── demo_scenarios.md       # ★ 4 scripted scenarios with exact payloads
│   ├── compliance_mapping.md   # ★ RBI / DPDP / GDPR mapping
│   └── scalability_writeup.md  # Ratnesh — horizontal scaling narrative
│
├── scripts/
│   └── seed_and_train.py       # ★ one-shot: generates data + trains all models
│
├── docker-compose.yml
└── requirements.txt
```

> ★ = key file to understand first

---

## Quickstart

### Prerequisites

```bash
# Python 3.10+
pip install -r requirements.txt

# Optional (for device-trust GNN):
pip install torch torch_geometric

# Optional (for behavioral autoencoder):
pip install torch

# Frontend
cd frontend && npm install
```

### Step 1 — Seed data and train all models

```bash
# From repo root:
python scripts/seed_and_train.py
```

This will:
1. Generate **~3,000 synthetic banking events** spanning 30 days (logins, transactions, KYC onboarding, admin actions), with injected fraud and insider-misuse signals
2. Write them to the feature store under `feature_store/data/`
3. Train all four detectors in sequence and save artifacts under `ml/<detector>/artifacts/`

**Options:**
```bash
python scripts/seed_and_train.py --n 10000       # larger dataset
python scripts/seed_and_train.py --skip-gnn      # skip device-trust GNN (no torch)
python scripts/seed_and_train.py --seed-only     # only generate data, don't train
python scripts/seed_and_train.py --train-only    # train on existing store data
```

### Step 2 — Start the FastAPI backend

```bash
uvicorn backend.main:app --reload --port 8000
```

The scoring API is now live at `http://localhost:8000`.  
`/score` will automatically use **real trained models** if artifacts exist, or fall back to mocks if not.

API docs: `http://localhost:8000/docs`

### Step 3 — Start the frontend

```bash
cd frontend
npm run dev
```

Dashboard: `http://localhost:3000/dashboard`

---

## The four ML detectors

### 1. Behavioral Anomaly Detector (`ml/behavioral/`)

**What it catches:** Unusual session patterns — logins at anomalous hours, abnormal transaction velocity,
rapid failures followed by success (credential stuffing).

**Model:** Isolation Forest + Autoencoder **ensemble** (score = max of both).  
The two models fail on different anomaly shapes — taking the max means only one needs to catch
a pattern for it to surface. This trades a little precision for meaningfully better recall,
the right trade-off when a missed fraud is costlier than an extra analyst review.

**Features:** Login-hour z-score vs user baseline, failed-login count in sliding window,
session duration percentile, transaction velocity (amount/count per hour), device-switch frequency.

**Autoencoder is optional** — if `torch` is not installed, the module gracefully degrades to Isolation Forest only, logging a warning.

---

### 2. Device Trust GNN Detector (`ml/device_trust/`)

**What it catches:** New or suspicious device/IP usage — first-seen devices, devices or IPs
shared across an implausibly large number of unrelated users (device-farm / SIM-farm signature).

**Model:** GraphSAGE/GAT heterogeneous GNN trained with self-supervised link prediction on the
user–device–IP graph.  A known (user, device) pair that the model has learned looks "structurally
normal" gets a low risk score; an unknown device or a high-fanout node gets a risk bonus.

**Two-layer defence:** GNN link score + explicit fan-out guardrail. A compliance-sensitive detector
shouldn't rely solely on a learned model for a well-understood structural red flag that can be
checked directly and cheaply.

**Requires:** `torch` + `torch_geometric`. Falls back to a moderate default score (0.55) if untrained.

---

### 3. KYC Fraud Detector (`ml/kyc_fraud/`)

**What it catches:** Fraudulent onboarding — PAN/phone/address reuse across multiple accounts,
rapid KYC edits, immediate transaction attempts following a KYC change.

**Model:** CatBoost classifier (falls back to LightGBM via joblib if CatBoost is not installed)
trained on weak labels generated from heuristic rules over KYC features. Includes a SHAP
explainer that surfaces the top 3 reason codes per decision.

**Labels:** These are **weak labels**, not analyst-confirmed fraud. The training script prints
a note about this — treat validation metrics as a sanity check that the model recovers the
heuristic signal, not as a true precision/recall estimate.

**Only active for `event_type: onboarding`** — returns score=0.0 for all other event types.

---

### 4. Insider Misuse Detector (`ml/insider_misuse/`)

**What it catches:** Privileged user abuse — large balance overrides, KYC field overrides,
mass data exports, activity outside business hours.

**Two-layer design:**
- **Rule engine** (`rules.py`): deterministic, always fires for known patterns (mass export ≥5 in 10 min, balance override > ₹50K, any KYC field override). Results in reason codes with severity levels (low/medium/high/critical).
- **Cohort Isolation Forest** (`cohort_isolation_forest.py`): statistical, per-role peer-group baseline. A "support" agent doing 20 KYC overrides/day is a 4σ outlier vs their cohort even if no single action crosses a rule threshold.

**Combined via max()** — rules are deterministic escalations that must never be diluted by the
statistical model.

---

## Score fusion & decision engine

```
sub_scores = {
    "behavioral":     DetectorScore(score, confidence, reason_codes),
    "device_trust":   DetectorScore(...),
    "kyc":            DetectorScore(...),
    "insider_misuse": DetectorScore(...),
}
```

**Fusion** (`ml/fusion/score_fusion.py`):

```
fused_score = Σ (weight_i × confidence_i × score_i)  /  Σ (weight_i × confidence_i)
```

Config-driven weights (edit `backend/orchestrator/config.py`, no redeploy needed):

```python
behavioral:     0.30
device_trust:   0.25
kyc:            0.25
insider_misuse: 0.20
```

Confidence-weighting means a detector that hasn't been trained (confidence=0.0) doesn't
dilute the fused score — it simply drops out of the calculation.

**MetaClassifier upgrade path:** Once the audit log accumulates ≥200 analyst-confirmed
outcomes, `MetaClassifierFusion` can be fitted to learn non-linear interactions between
sub-scores (e.g. "high device_trust risk is much scarier when kyc is also elevated").
It falls back to weighted average automatically below that data threshold.

**Decision thresholds:**

| Score range | Decision |
|---|---|
| < 0.35 | `allow` |
| 0.35 – 0.70 | `step_up` |
| ≥ 0.70 | `block` |

**Reason codes** (`ml/fusion/reason_codes.py`) are deduplicated, ranked by detector score,
and rendered as human-readable sentences for the analyst dashboard.

---

## Privacy layer

All PII is pseudonymised **before it touches the feature store or audit log**:

```python
# backend/privacy/hashing.py
hash_pii("user_123")  # → salted HMAC-SHA256 hex digest

# Fields hashed by default:
#   user_id, device_id, ip_address, beneficiary_id
```

- **Salt** is loaded from `PII_HASH_SALT` env var. The demo uses a fixed default — change this in production.
- **Deterministic** — same raw value always hashes the same way within a process lifetime, preserving joinability across events without exposing the raw value.
- **Audit log entries** store only the hashed user_id alongside: event_id, fused score, sub-scores, reason codes, decision, policy version, timestamp, purpose basis.
- **Differential privacy** (`backend/privacy/differential_privacy.py`) injects calibrated Laplace noise (ε=1.0) into training aggregates via `diffprivlib`, so individual event presence/absence cannot be inferred from trained model weights.

### PII fields requiring hashing before feature store entry

| Field | Hash before store | Notes |
|---|---|---|
| `user_id` | ✅ Always | Primary identity |
| `device_id` | ✅ Always | Linkable to user |
| `ip_address` | ✅ Always | Network identity |
| `beneficiary_id` | ✅ Always | Third-party PII |
| `pan_number` | ✅ On KYC events | Government ID |
| `phone_number` | ✅ On KYC events | Contact info |
| `admin_role` | ❌ Not PII | Used for cohort grouping |
| `event_type` | ❌ Not PII | Event metadata |
| `txn_amount` | ❌ Not PII | Business data |

---

## FastAPI backend

**Start:** `uvicorn backend.main:app --reload --port 8000`  
**Docs:** `http://localhost:8000/docs`

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check → `{"status": "ok"}` |
| `POST` | `/score` | ★ Combined score — fused result + audit log write |
| `POST` | `/score/behavioral` | Behavioral sub-score only |
| `POST` | `/score/device_trust` | Device trust sub-score only |
| `POST` | `/score/kyc` | KYC fraud sub-score only |
| `POST` | `/score/insider_misuse` | Insider misuse sub-score only |
| `POST` | `/stepup_auth` | Mock step-up verification |
| `GET` | `/feed` | SSE live event feed (Rupali integration) |

### Request shape (all `/score/*` endpoints)

```json
{
  "event": {
    "event_id":         "uuid-string",
    "event_type":       "login | transaction | onboarding | admin_action",
    "user_id":          "user_42",
    "device_id":        "device_7",
    "ip_address":       "10.0.1.1",
    "timestamp":        "2026-08-05T10:30:00Z",
    "login_success":    true,
    "txn_amount":       null,
    "txn_currency":     null,
    "beneficiary_id":   null,
    "kyc_field_changed": null,
    "admin_action_type": null,
    "admin_role":       null
  }
}
```

### Response shape (`/score`)

```json
{
  "fused_score": 0.712,
  "decision":    "block",
  "sub_scores": {
    "behavioral":     {"score": 0.81, "confidence": 0.9, "reason_codes": ["unusual_login_time"]},
    "device_trust":   {"score": 0.55, "confidence": 0.8, "reason_codes": ["new_device"]},
    "kyc":            {"score": 0.05, "confidence": 1.0, "reason_codes": []},
    "insider_misuse": {"score": 0.0,  "confidence": 1.0, "reason_codes": []}
  },
  "reason_codes": [
    "unusual_login_time",
    "new_device"
  ]
}
```

### Real models vs mock fallback

`score.py` attempts to load real trained artifacts on first call to each endpoint.
If artifacts don't exist (i.e. `seed_and_train.py` hasn't been run), it logs a warning
and transparently falls back to the beta-variate mock detectors.

No code change is needed to switch — just train and restart uvicorn.

---

## Frontend dashboard

**Start:** `cd frontend && npm run dev`  
**URL:** `http://localhost:3000`

### Pages

| Path | Description |
|---|---|
| `/` | Landing / home |
| `/dashboard` | ★ Main threat monitor (live feed, score cards, event table, drill-down) |
| `/stepup` | Step-up auth UI (OTP / FIDO2 biometric / liveness) |
| `/insider-misuse` | Insider threat view |
| `/privacy-audit` | Audit log / compliance trail |
| `/system-health` | System health indicators |

### Dashboard components

| Component | What it shows |
|---|---|
| `LiveFeedTicker` | Real-time event stream, colour-coded by decision |
| `GlobalTrustCard` | Allow/step-up/block breakdown across recent events |
| `StepUpAuthCard` | Step-up auth success/failure stats |
| `HighRiskEventsTable` | Sortable table of flagged events with score bars |
| `ScoreFusionCard` | Sub-score breakdown bar chart |
| `CaseDrillDownPanel` | Per-event detail: 4 sub-scores, SHAP reason codes, audit entry |
| `SHAPReasonCodes` | Waterfall chart of reason codes ranked by contribution |
| `DeviceGraphView` | User–device–IP graph visual |
| `AnomalousOriginsCard` | IP/device cluster anomaly map |

---

## Demo scenarios

See [`docs/demo_scenarios.md`](docs/demo_scenarios.md) for the full four-scenario script with
exact event payloads, expected outcomes, and presenter narration notes.

**Quick reference:**

| # | Scenario | Decision | Key signal |
|---|---|---|---|
| 1 | Normal login | `allow` | Baseline — no friction |
| 2 | New device + 2 AM | `step_up` | Behavioral + Device Trust |
| 3 | KYC onboarding fraud | `block` | CatBoost + SHAP codes |
| 4 | Admin insider misuse | `block` | Rule engine + Cohort IF |

---

## Compliance mapping

See [`docs/compliance_mapping.md`](docs/compliance_mapping.md) for the full table mapping
each AlertixAI feature to:
- RBI Master Direction on IT (Cybersecurity Framework)
- DPDP Act, 2023
- GDPR (reference)

**Key compliance hooks:**

- Every `/score` call writes a PII-safe audit-log entry → satisfies RBI §5.3 audit trail requirement
- Salted HMAC hashing satisfies DPDP §8(2) security safeguards
- SHAP reason codes satisfy GDPR Art. 22 right-to-explanation for automated decisions
- Purpose basis field in audit log satisfies DPDP §4 (lawful processing)

---

## Scalability

The scoring service is designed to scale horizontally:

- **Stateless scoring:** Each `/score` request is self-contained — no shared in-process state
  between requests (model artifacts are loaded once per worker at startup). Add uvicorn workers
  or replicas behind a load balancer without coordination.
- **Kafka partitioning by user_id:** Event ordering per user is preserved; partitions can be
  rebalanced as event volume grows.
- **Feature store sharding:** Parquet partitions by `event_type/date` — shard by date range
  across storage nodes for large deployments.
- **Retraining pipeline:** `seed_and_train.py --train-only` re-trains on the accumulated
  feature store without regenerating synthetic data — wire this to a nightly Airflow/Prefect DAG.
- **GNN cold start:** `DeviceTrustDetector.score_event()` returns a moderate default (0.55)
  for brand-new (user, device) pairs the graph hasn't seen — no crash, no silent failure.

---

## Team & ownership

| Person | Track | Key files |
|---|---|---|
| **Muskan** | ML / Risk Scoring | `ml/` (all four detectors + fusion), `scripts/seed_and_train.py`, `docs/` (scope, scenarios, compliance) |
| **Ratnesh** | Backend / Systems & Privacy | `backend/`, `ingestion/`, `feature_store/`, `docker-compose.yml`, `docs/scalability_writeup.md` |
| **Rupali** | Frontend / Dashboard | `frontend/`, `backend/routers/feed.py` (SSE live feed) |

---

## Running the full demo

```bash
# Terminal 1 — seed data and train
python scripts/seed_and_train.py

# Terminal 2 — start backend
uvicorn backend.main:app --reload --port 8000

# Terminal 3 — start frontend
cd frontend && npm run dev

# Open http://localhost:3000/dashboard
# Follow the 4 scenarios in docs/demo_scenarios.md
```

### Freeze checklist (do this ≥4 hours before deadline)

- [ ] `seed_and_train.py` has been run and all 4 detectors report `OK` in the summary
- [ ] `uvicorn` starts cleanly and `/health` returns `{"status": "ok"}`
- [ ] Frontend builds without TypeScript errors (`npm run build`)
- [ ] All 4 demo scenarios produce the expected decision from `/score`
- [ ] Audit log has entries in `feature_store/audit_log/`
- [ ] Step-up OTP flow completes successfully in the browser
- [ ] SHAP reason codes are visible and legible in the case drill-down panel
- [ ] Compliance mapping doc is complete (`docs/compliance_mapping.md`)
- [ ] Demo rehearsed at least twice end-to-end
