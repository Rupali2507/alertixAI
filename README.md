# AlertixAI — Privacy-First, Risk-Based Identity Trust Framework

> **Continuous · Risk-Based · Privacy-Preserving**
> A real-time Identity Trust Framework for digital banking that continuously validates customer and
> enterprise identities across every digital channel — detecting account takeover, KYC/onboarding
> fraud, and insider misuse — and triggers step-up verification **only when risk is actually elevated**.

---

## Table of Contents

1. [Problem statement](#problem-statement)
2. [Solution summary](#solution-summary)
3. [Design principles](#design-principles)
4. [Architecture overview](#architecture-overview)
5. [Repository layout](#repository-layout)
6. [Quickstart](#quickstart)
7. [Risk categories & detectors](#risk-categories--detectors)
8. [Score fusion & decision engine](#score-fusion--decision-engine)
9. [Privacy-by-construction layer](#privacy-by-construction-layer)
10. [FastAPI backend](#fastapi-backend)
11. [Frontend analyst console](#frontend-analyst-console)
12. [Demo scenarios](#demo-scenarios)
13. [Compliance mapping](#compliance-mapping)
14. [Scalability & multi-channel readiness](#scalability--multi-channel-readiness)
15. [Outcomes & success metrics](#outcomes--success-metrics)
16. [Team & ownership](#team--ownership)
17. [Roadmap / what's architected vs. built](#roadmap--whats-architected-vs-built)

---

## Problem statement

Digital banking channels — mobile, web, IVR, partner APIs, and internal admin consoles — each
present a distinct identity-risk surface, but customers and enterprise users increasingly expect a
single, seamless trust experience across all of them. Point-in-time authentication (a password or
OTP checked once at login) is structurally blind to what happens *after* that identity is presumed
verified: a hijacked session, a synthetic identity threaded through onboarding, or a privileged
insider quietly exceeding their mandate.

AlertixAI directly answers the challenge brief:

- **Continuously validate** customer and enterprise identities across digital channels — not a
  single login gate, but per-event risk scoring on every login, transaction, onboarding action,
  and administrative action.
- **Detect high-risk events**, specifically:
  - Anomalous behavioral patterns (velocity spikes, off-hours access, deviation from a user's own
    baseline)
  - New / suspicious device usage (device-farm and SIM-farm fan-out signatures)
  - Suspicious onboarding and account-recovery attempts (synthetic identity, KYC-field reuse across
    accounts)
  - Misuse of privileged/insider access (balance overrides, mass data exports, peer-cohort
    deviation for administrative roles)
- **Trigger verification only when risk is elevated** — a three-state decision (allow / step-up /
  block) rather than a binary gate, so friction is proportional to actual risk rather than applied
  uniformly.
- **Reduce account takeover, KYC fraud, and insider misuse** while remaining **privacy-preserving**,
  auditable, and **scalable** as channel count and transaction volume grow.

---

## Solution summary

AlertixAI is a **continuous, risk-based, privacy-preserving Identity Trust Framework**. Every
customer or administrator event — login, transaction, KYC onboarding/recovery, admin action — is
converted into a fixed identity-risk vector by **four independent, purpose-built detectors**, fused
into a single **composite trust score**, and routed to one of three outcomes:

| Decision | Fused Risk Score | User / Enterprise Experience |
|---|---|---|
| **Allow** | < 0.35 | Seamless pass-through — zero added friction |
| **Step-up** | 0.35 – 0.70 | Targeted verification (OTP / biometric / liveness) |
| **Block** | ≥ 0.70 | Access denied; analyst alerted with explainable rationale |

Each decision carries a full **explainability trail** (ranked SHAP / feature-deviation reason
codes), a **tamper-evident audit entry** with hashed PII, and sub-100ms inference latency, so the
framework can sit directly in the transaction-authorization critical path without becoming a
bottleneck.

---

## Design principles

These are the non-negotiable constraints the architecture was built against, directly derived from
the problem statement:

1. **Continuous, not point-in-time.** Trust is a live, per-event score — not a session flag set
   once at login and trusted for the session's duration. Every event re-evaluates risk causally
   against the user's own history (see `ml/behavioral/feature_engineering.py`).
2. **Risk-proportional friction.** The decision engine (`backend/orchestrator/decision_engine.py`)
   enforces a continuous three-band policy so that ~95% of legitimate traffic is never
   interrupted — friction is reserved for the risk band where it's actually warranted.
3. **Privacy by construction, not by policy.** Raw PII (`user_id`, `device_id`, `ip_address`,
   `beneficiary_id`, PAN/phone/address) is salted-HMAC hashed **before** it reaches the feature
   store or audit log (`backend/privacy/hashing.py`). Differential-privacy noise
   (`backend/privacy/differential_privacy.py`) is applied to training aggregates. No raw PII is
   ever present in a trained model artifact or a log line.
4. **Explainability as a first-class output, not an afterthought.** Every detector emits reason
   codes; the KYC detector emits full SHAP attributions (`ml/kyc_fraud/shap_explainer.py`);
   `ml/fusion/reason_codes.py` de-duplicates and ranks them into analyst- and
   regulator-legible sentences.
5. **Defense-in-depth over any single model.** Structural red flags that can be checked directly
   and cheaply (e.g., device/IP fan-out) are never left solely to a learned model's judgment — see
   the explicit guardrail bonus in `ml/device_trust/train.py`.
6. **Graceful degradation, never silent failure.** Every detector interface
   (`ml/interfaces/detector_base.py`) is contractually required to return a bounded, well-defined
   score even on a cold-start event it has never seen — no exceptions, no undefined behavior on
   the scoring critical path.
7. **Config-driven, ops-adjustable.** Decision thresholds and fusion weights
   (`backend/orchestrator/config.py`) are structured data, not hardcoded constants — retunable
   without a redeploy as the bank's risk appetite evolves.

---

## Architecture overview

```
Banking channels (mobile · web · IVR · partner API · admin console)
        │  login / transaction / onboarding / admin_action events
        ▼
┌──────────────────┐     Kafka / Redis Streams (partitioned by user_id)
│  Event Ingestion │──────────────────────────────────────────────────┐
│ (ingestion/)     │                                                  │
└──────────────────┘                                                  ▼
                                                          ┌──────────────────────┐
                                                          │   Feature Store      │
                                                          │ (Parquet, partitioned│
                                                          │  event_type + date)  │
                                                          └──────────────────────┘
                                                                      │
                                   ┌──────────────────────────────────┼──────────────────────────────────┐
                                   ▼                                  ▼                                  ▼
                          ┌─────────────────┐             ┌────────────────────┐             ┌──────────────────────┐
                          │ Behavioral      │             │ Device Trust       │             │   KYC / Onboarding   │
                          │ Detector        │             │ GNN Detector       │             │   Fraud Detector     │
                          │ (Isolation      │             │ (GraphSAGE + GAT   │             │ (CatBoost + SHAP)    │
                          │  Forest + AE)   │             │  link prediction)  │             │                      │
                          └─────────────────┘             └────────────────────┘             └──────────────────────┘
                                   │                                  │                                  │
                                   └──────────────────────────────────┼──────────────────────────────────┘
                                                                      │
                                                          ┌───────────────────────┐
                                                          │  Insider / Privileged │
                                                          │  Access Misuse        │
                                                          │  (Cohort IF + Rules)  │
                                                          └───────────────────────┘
                                                                      │
                                   ┌──────────────────────────────────┘
                                   ▼
                          ┌──────────────────────┐
                          │   Score Fusion        │  confidence-weighted average
                          │ (config-driven, meta- │  (upgrade path: logistic
                          │  classifier upgrade)  │   meta-classifier)
                          └──────────────────────┘
                                   │
                                   ▼
                          ┌──────────────────────┐      ┌──────────────────────────┐
                          │  Decision Engine      │─────▶│  Privacy-Safe Audit Log  │
                          │  allow / step_up /    │      │  (hashed PII, JSONL,     │
                          │  block                │      │   tamper-evident)        │
                          └──────────────────────┘      └──────────────────────────┘
                                   │
                          ┌────────┴────────┐
                          ▼                 ▼
                   Step-up Auth        Analyst Console
                   (OTP / biometric /   (Next.js — live feed, SHAP
                    liveness)            reason codes, identity graph)
```

**Why this shape.** Fraud rings and account-takeover show up as different *failure modes* —
behavioral anomalies, graph/structural anomalies, population-level identity reuse, and
role-inconsistent privileged action are not the same signal and do not share a feature space. A
single monolithic model would either miss category-specific signal or require an intractable
joint feature space. Four purpose-built detectors, fused with confidence weighting, let each
sub-model reason about the failure mode it is structurally best suited to catch.

---

## Repository layout

```
alertixAI/
│
├── ingestion/                  # Event ingestion — channel-agnostic intake
│   ├── event_generator.py      # synthetic event factory (demo/dev)
│   ├── kafka_producer.py       # Kafka producer
│   ├── kafka_consumer.py       # consumer → feature store
│   └── schemas/
│       └── event_schema.json   # canonical cross-channel event shape
│
├── feature_store/               # Parquet feature store + audit trail
│   ├── store.py                # write_batch(), read_all()
│   ├── audit_log/               # JSONL audit log, date-partitioned
│   └── data/                   # auto-created on first write
│
├── ml/                         # All four detectors + fusion
│   ├── interfaces/
│   │   ├── detector_base.py    # ★ frozen BaseDetector contract
│   │   ├── model_schema.py     # DetectorScore, FusedScore
│   │   └── mock_detectors.py   # pre-training fallback (beta-variate)
│   │
│   ├── behavioral/              # anomalous-behavior detector
│   │   ├── feature_engineering.py
│   │   ├── isolation_forest.py
│   │   ├── autoencoder.py       # optional: requires torch
│   │   └── train.py             # → BehavioralDetector
│   │
│   ├── device_trust/            # new/suspicious device usage
│   │   ├── graph_builder.py     # user–device–IP heterogeneous graph
│   │   ├── graphsage_gat.py     # GNN architecture
│   │   └── train.py             # → DeviceTrustDetector
│   │
│   ├── kyc_fraud/                # suspicious onboarding / recovery
│   │   ├── feature_engineering.py
│   │   ├── catboost_model.py
│   │   ├── shap_explainer.py
│   │   └── train.py              # → KYCFraudDetector
│   │
│   ├── insider_misuse/           # privileged-access misuse
│   │   ├── cohort_isolation_forest.py  # → CohortIsolationForestDetector
│   │   ├── rules.py              # InsiderMisuseRuleEngine (deterministic)
│   │   └── test_rules.py
│   │
│   ├── fusion/
│   │   ├── score_fusion.py       # WeightedAverageFusion + MetaClassifierFusion
│   │   └── reason_codes.py       # de-dup, rank, humanize reason codes
│   │
│   └── train_all.py              # trains all 4 detectors in dependency order
│
├── backend/                      # FastAPI orchestrator
│   ├── main.py                   # app + router registration
│   ├── orchestrator/
│   │   ├── config.py             # thresholds + fusion weights (config-driven)
│   │   └── decision_engine.py    # fuse_scores(), decide(), build_decision()
│   ├── privacy/
│   │   ├── hashing.py            # salted HMAC-SHA256 PII hashing
│   │   ├── differential_privacy.py  # Laplace-mechanism DP noise
│   │   └── audit_log.py          # JSONL audit writer
│   └── routers/
│       ├── score.py              # ★ /score, /score/{detector}
│       ├── stepup_auth.py        # step-up verification endpoint
│       ├── feed.py               # SSE live decision feed
│       ├── simulator.py          # scripted attack-scenario injection
│       ├── audit.py              # audit-log read endpoint
│       └── graph.py              # identity-graph read endpoint
│
├── frontend/                     # Next.js analyst console
│   └── app/
│       ├── dashboard/            # main threat-monitor console
│       ├── graph/                # 3D identity-graph explorer
│       ├── stepup/               # step-up auth UI
│       ├── insider-misuse/       # privileged-access investigation view
│       ├── privacy-audit/        # audit log / compliance view
│       └── system-health/        # infrastructure telemetry
│
├── docs/
│   ├── scope_statement.md        # ★ what's built vs. architected-only
│   ├── demo_scenarios.md         # ★ four scripted scenarios, exact payloads
│   ├── compliance_mapping.md     # ★ RBI / DPDP / GDPR mapping
│   ├── scalability_writeup.md    # horizontal-scaling narrative
│   └── metrics_pitch.md          # evaluation methodology & performance summary
│
├── scripts/
│   └── seed_and_train.py         # ★ one-shot: generate data + train all detectors
│
├── docker-compose.yml
└── requirements.txt
```

> ★ = start here

---

## Quickstart

### Prerequisites

```bash
# Python 3.10+
pip install -r requirements.txt

# Optional (device-trust GNN):
pip install torch torch_geometric --break-system-packages

# Optional (behavioral autoencoder):
pip install torch --break-system-packages

# Frontend
cd frontend && npm install
```

### Step 1 — Seed synthetic data and train all detectors

```bash
python scripts/seed_and_train.py
```

This generates ~3,000 synthetic banking events spanning 30 days across all four event types
(login, transaction, onboarding, admin action) with injected fraud, device-farm, and
insider-misuse signals, writes them to the Parquet feature store, and trains all four detectors
in dependency order (lightest to heaviest).

```bash
python scripts/seed_and_train.py --n 10000       # larger dataset
python scripts/seed_and_train.py --skip-gnn      # skip device-trust GNN (no torch)
python scripts/seed_and_train.py --seed-only     # generate data only
python scripts/seed_and_train.py --train-only    # train on existing store data
```

### Step 2 — Start the scoring API

```bash
uvicorn backend.main:app --reload --port 8000
```

`/score` automatically loads real trained artifacts when present, falling back transparently to
mock detectors otherwise — no code change required to switch. API docs at
`http://localhost:8000/docs`.

### Step 3 — Start the analyst console

```bash
cd frontend
npm run dev
```

Console at `http://localhost:3000/dashboard`.

---

## Risk categories & detectors

Mapping directly to the four high-risk event categories in the problem statement:

### 1. Anomalous behavioral patterns → Behavioral Detector (`ml/behavioral/`)

**Catches:** credential-stuffing signatures, impossible-travel velocity, off-baseline transaction
amounts, session patterns that deviate from a user's own history.

**Model:** Isolation Forest + Autoencoder, combined via **max()** rather than average — the two
models fail on different anomaly shapes (axis-aligned outliers vs. nonlinear feature
*interactions*), so only one needs to catch a pattern for it to surface. This trades a small
amount of precision for materially better recall, the correct trade-off when a missed
account-takeover is costlier than an extra step-up challenge.

**Causal, online-safe features:** every feature is computed only from events strictly prior to the
scored event (`feature_engineering.py`), so the same code path is correct for both batch training
and live, streaming inference — no train/serve skew by construction.

### 2. New / suspicious device usage → Device Trust GNN (`ml/device_trust/`)

**Catches:** first-seen devices, and — the harder case — devices or IPs shared across an
implausible number of *otherwise unrelated* accounts (device-farm / SIM-farm signature), which is
a structural, graph-level pattern a per-event tabular model cannot see.

**Model:** self-supervised GraphSAGE + GAT link prediction over a heterogeneous user–device–IP
graph. A (user, device) pairing the model can confidently justify from graph structure scores low
risk; one it cannot gets flagged.

**Explicit fan-out guardrail:** regardless of the learned score, a device/IP touching more than a
configurable threshold of unrelated users/devices adds a direct risk bonus
(`FANOUT_RISK_THRESHOLD` in `train.py`) — defense-in-depth for a structural signature that
shouldn't depend solely on model confidence.

### 3. Suspicious onboarding & account-recovery attempts → KYC Fraud Detector (`ml/kyc_fraud/`)

**Catches:** synthetic-identity signatures — PAN/phone/address reuse *across accounts*, rapid KYC
field edits, and "burst-and-cash-out" (KYC edit followed immediately by a transaction attempt).

**Model:** CatBoost gradient-boosted trees (native categorical handling avoids target leakage on
high-cardinality categorical KYC fields), with a SHAP explainer surfacing the top-3 drivers per
decision — required for regulator-facing explainability, not just UX polish.

**Population-level reasoning:** unlike the behavioral and device-trust detectors, KYC fraud
reasons across the *whole population* of accounts simultaneously (`build_kyc_features` in
`feature_engineering.py`), since identity reuse is invisible from any single account's history
alone.

### 4. Misuse of privileged / insider access → Insider Misuse Detector (`ml/insider_misuse/`)

**Catches:** large balance overrides, unauthorized KYC field overrides, mass data exports,
off-hours privileged activity, and "low-and-slow" exfiltration that stays under any single
deterministic threshold.

**Two-layer design, combined via max():**
- **Deterministic rule engine** (`rules.py`) — always fires for known-bad patterns (≥5 exports in
  10 minutes, balance override > ₹50K, any KYC field override), with severity-graded reason codes.
- **Per-cohort Isolation Forest** (`cohort_isolation_forest.py`) — peer-group anomaly detection.
  "Normal" varies sharply by role (a KYC-ops admin doing 20 overrides/day is routine; a support
  agent doing the same is a 4σ outlier vs. their cohort), so each role cohort gets its own learned
  baseline rather than one global notion of normal.

Rules are deterministic escalations that must never be diluted by the statistical layer — hence
`max()`, not a weighted blend, at the combination point.

---

## Score fusion & decision engine

```python
sub_scores = {
    "behavioral":     DetectorScore(score, confidence, reason_codes),
    "device_trust":   DetectorScore(...),
    "kyc":            DetectorScore(...),
    "insider_misuse": DetectorScore(...),
}
```

**Confidence-weighted fusion** (`ml/fusion/score_fusion.py`):

```
fused_score = Σ (weight_i × confidence_i × score_i)  /  Σ (weight_i × confidence_i)
```

A detector that has no signal for a given event (e.g., a cold-started device-trust model with
confidence 0) is automatically down-weighted rather than diluting the fused score at its full
nominal config weight.

Config-driven, ops-adjustable weights (`backend/orchestrator/config.py`):

```python
behavioral:     0.30
device_trust:   0.25
kyc:            0.25
insider_misuse: 0.20
```

**Meta-classifier upgrade path.** `MetaClassifierFusion` learns non-linear cross-detector
interactions (e.g., "elevated device-trust risk is far more concerning when KYC risk is also
elevated" is multiplicative, not additive) once the audit log accumulates ≥200
analyst-confirmed outcomes. Below that threshold it transparently falls back to the weighted
average — a learned model trained on too little labeled data would overfit noise, so the fallback
is the *correct* behavior for a cold-start deployment, not a placeholder.

**Decision thresholds:**

| Score range | Decision | Rationale |
|---|---|---|
| < 0.35 | `allow` | Risk indistinguishable from baseline — zero friction |
| 0.35 – 0.70 | `step_up` | Elevated but not conclusive — targeted verification |
| ≥ 0.70 | `block` | High-confidence risk — deny and alert |

**Reason codes** (`ml/fusion/reason_codes.py`) are de-duplicated across detectors, ranked by
(detector score, fixed severity prior), and rendered as human-readable sentences — satisfying the
"confirm reason codes render legibly to a non-technical reviewer" requirement for analyst and
regulator consumption alike.

---

## Privacy-by-construction layer

Every raw PII field is pseudonymized **before** it reaches the feature store or the audit log —
never merely restricted by access control after the fact.

```python
# backend/privacy/hashing.py
hash_pii("user_123")  # → salted HMAC-SHA256 hex digest

# Hashed by default: user_id, device_id, ip_address, beneficiary_id
# Hashed on KYC events: pan_number, phone_number, address
```

| Property | Mechanism |
|---|---|
| **Deterministic joinability without exposure** | Same raw value always hashes identically within a salt lifetime, preserving cross-event correlation (needed for velocity/graph features) without ever persisting the raw value. |
| **Salt-controlled de-linkage** | `PII_HASH_SALT` env var; rotating the salt irreversibly severs historic audit entries from the underlying data principal — satisfies right-to-erasure-style requirements. |
| **DP-noised training aggregates** | `backend/privacy/differential_privacy.py` (Laplace mechanism, ε configurable, default ε=1.0) — no individual event's presence can be inferred from trained model weights. |
| **Zero raw PII in the feature store** | Confirmed by design in `feature_store/store.py` — nothing is written to Parquet until it has passed through the hashing layer. |
| **Audit-log minimality** | `write_audit_entry()` persists only: event_id, hashed user_id, decision, sub-scores, fused score, reason codes, policy version, consent basis, timestamp — never a raw identifier. |

---

## FastAPI backend

**Start:** `uvicorn backend.main:app --reload --port 8000` · **Docs:** `/docs`

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `POST` | `/score` | ★ Combined fused score + audit-log write |
| `POST` | `/score/behavioral` | Behavioral sub-score only |
| `POST` | `/score/device_trust` | Device-trust sub-score only |
| `POST` | `/score/kyc` | KYC-fraud sub-score only |
| `POST` | `/score/insider_misuse` | Insider-misuse sub-score only |
| `POST` | `/stepup/initiate`, `/stepup/verify` | Step-up verification flow |
| `GET` | `/feed` | Server-sent-events live decision stream |
| `POST` | `/simulate` | Inject a scripted demo scenario |
| `GET` | `/audit` | Privacy-safe audit-log read |
| `GET` | `/graph/identity` | Real user–device–IP identity graph |

**Real models vs. mock fallback:** `score.py` attempts to load trained artifacts per detector on
first call; if `seed_and_train.py` hasn't been run yet, it logs a warning and transparently falls
back to a mock detector so the API — and the frontend built against it — remains usable throughout
development. No code changes are needed to switch between the two states; only training +
restart.

---

## Frontend analyst console

**Start:** `cd frontend && npm run dev` · `http://localhost:3000`

| Path | Purpose |
|---|---|
| `/` | Landing |
| `/dashboard` | ★ Live threat monitor — trust surface hero, per-category risk grid, live event stream, case drill-down |
| `/graph` | 3D force-directed identity graph (user–device–IP), sourced from the real feature store |
| `/stepup` | Step-up authentication UI (OTP / FIDO2 biometric / liveness) |
| `/insider-misuse` | Privileged-access investigation view — sliding-window detection, threshold controls, escalated alerts |
| `/privacy-audit` | Differential-privacy analytics, compliance mapping, audit-log explorer |
| `/system-health` | Kafka / FastAPI / model-inference / feature-store telemetry |

Case drill-down (`CaseDrillDownPanel.tsx`) surfaces, per event: the fused trust gauge, sub-score
breakdown, ranked SHAP reason codes, the real device/IP trust graph for that identity, raw
event-detail fields (never synthesized), and the privacy-vault compliance strip confirming
tokenization status.

---

## Demo scenarios

Full scripted walkthrough with exact payloads in [`docs/demo_scenarios.md`](docs/demo_scenarios.md).

| # | Scenario | Decision | Primary signal |
|---|---|---|---|
| 1 | Normal login, known device, business hours | `allow` | Baseline — invisible to the user |
| 2 | New device at 2 AM | `step_up` | Behavioral + Device Trust |
| 3 | Onboarding fraud — reused PAN/phone/address, rapid edits | `block` | CatBoost + SHAP reason codes |
| 4 | Admin balance override + mass export, off-hours | `block` | Rule engine + Cohort Isolation Forest |

---

## Compliance mapping

Full traceability in [`docs/compliance_mapping.md`](docs/compliance_mapping.md), mapping each
system feature to:

- **RBI Cybersecurity Framework** — continuous authentication (§4.3), real-time anomaly alerting
  (§4.5), privileged-access monitoring (§4.8), MFA framework (§4.6), tamper-evident audit trail
  (§5.3), data localization (§3.4)
- **DPDP Act, 2023** — lawful-purpose processing (§4), data minimization (§6(1)), PII
  pseudonymization (§8(2)), purpose limitation (§6(2)), right to erasure via salt rotation (§13)
- **GDPR (reference)** — lawfulness/transparency (Art. 5(1)(a)), data minimization (Art. 5(1)(c)),
  storage limitation (Art. 5(1)(e)), right to explanation for automated decisions (Art. 22)

---

## Scalability & multi-channel readiness

Full narrative in [`docs/scalability_writeup.md`](docs/scalability_writeup.md). Key properties:

- **Channel-agnostic ingestion.** The canonical event schema (`ingestion/schemas/event_schema.json`)
  is deliberately channel-neutral — mobile, web, IVR, partner API, or internal admin console all
  emit the same event shape, so onboarding a new banking channel is a producer-side integration,
  not a scoring-pipeline change.
- **Stateless scoring tier.** `backend/routers/score.py` loads model artifacts once per worker at
  startup and holds no shared state across requests — horizontally scales linearly behind a
  standard load balancer as transaction volume grows (validated design target: 5,000+ events/sec
  at sub-150ms scoring latency).
- **User-partitioned event ordering.** Kafka topics are partitioned by `user_id`, guaranteeing
  sequential per-user processing without cross-partition coordination as channel count increases.
- **Columnar, date-partitioned feature store.** Parquet partitioning by `event_type`/`date`
  supports both high-throughput writes and fast analytical reads for retraining, with a defined
  hot/cold storage-tiering path (SSD → object storage) as historical volume grows.
- **Explicit GNN cold-start handling.** A brand-new user or device the graph hasn't seen yet
  returns a moderate default risk (0.55) rather than blocking or erroring, letting the other three
  detectors carry the decision until the graph updates — critical as new channels or enterprise
  partners onboard entirely new identity populations.
- **Retraining as a scheduled job, not a redeploy.** `scripts/seed_and_train.py --train-only`
  retrains against the accumulated feature store; wiring this to a nightly Airflow/Prefect DAG
  keeps all four detectors current as behavior and channel mix shift over time.

---

## Outcomes & success metrics

Directly targeting the expected outcomes in the challenge brief; methodology and current figures
in [`docs/metrics_pitch.md`](docs/metrics_pitch.md).

| Outcome area | How AlertixAI addresses it |
|---|---|
| **Reduced account takeover** | Behavioral + Device Trust detectors jointly catch impossible-travel and new-device signatures; ~85% of injected malicious login sequences land in the top 5% of anomaly scores in evaluation. |
| **Reduced KYC / onboarding fraud** | Population-level identity-reuse detection (PAN/phone/address) plus edit-velocity and burst-to-transaction patterns, with full SHAP explainability for analyst confirmation. |
| **Reduced insider misuse** | Deterministic rule engine gives a 100% catch rate for explicit policy violations; per-cohort Isolation Forest catches "low-and-slow" patterns that stay under any single rule threshold. |
| **Secure & compliant access** | Salted-HMAC PII hashing, differential-privacy training noise, tamper-evident audit trail — mapped explicitly to RBI/DPDP/GDPR (see Compliance mapping). |
| **Friction-optimized access** | Three-band continuous decisioning keeps ~95% of legitimate traffic frictionless; step-up is issued, not a hard block, for the ambiguous middle band. |
| **Scalable across channels & volume** | Channel-neutral event schema, stateless horizontally-scalable scoring tier, partitioned ingestion and feature store (see Scalability). |

---

## Team & ownership

| Person | Track | Key files |
|---|---|---|
| **Muskan** | ML / Risk Scoring | `ml/` (all four detectors + fusion), `scripts/seed_and_train.py`, `docs/` (scope, scenarios, compliance, metrics) |
| **Ratnesh** | Backend / Systems & Privacy | `backend/`, `ingestion/`, `feature_store/`, `docker-compose.yml`, `docs/scalability_writeup.md` |
| **Rupali** | Frontend / Analyst Console | `frontend/`, `backend/routers/feed.py` (live SSE feed) |

---

## Roadmap / what's architected vs. built

All four detectors are **fully implemented and trainable end-to-end** — this is not a
mocked-model prototype. See [`docs/scope_statement.md`](docs/scope_statement.md) for the complete
build-vs-architected breakdown; summarized:

| Category | Status |
|---|---|
| Anomalous behavioral sessions (Isolation Forest + Autoencoder) | ✅ Fully built |
| New / suspicious device usage (GraphSAGE/GAT link prediction) | ✅ Fully built |
| KYC / onboarding fraud (CatBoost + SHAP) | ✅ Fully built |
| Insider / privileged access misuse (Cohort IF + deterministic rules) | ✅ Fully built |
| Score fusion (confidence-weighted average) | ✅ Fully built |
| Meta-classifier fusion upgrade | 🔵 Architected — activates automatically once the audit log reaches 200 labeled outcomes |
| Kafka production cluster | 🔵 Demo uses in-process/Redis Streams equivalent; architecture is Kafka-ready |
| Production secrets management | 🔵 Env-var driven for the demo; salt rotation path is designed but not automated |
| Analyst feedback-loop retraining | 🔵 Audit-log schema is designed for it; scheduling automation is future work |
| Multi-tenant isolation | 🔵 Single-bank deployment for this build; partitioning strategy generalizes |

---

## Running the full demo

```bash
# Terminal 1 — seed data and train
python scripts/seed_and_train.py

# Terminal 2 — start backend
uvicorn backend.main:app --reload --port 8000

# Terminal 3 — start frontend
cd frontend && npm run dev

# Open http://localhost:3000/dashboard and follow docs/demo_scenarios.md
```

### Freeze checklist (do this ≥4 hours before deadline)

- [ ] `seed_and_train.py` has been run and all four detectors report `OK` in the training summary
- [ ] `uvicorn` starts cleanly and `/health` returns `{"status": "ok"}`
- [ ] Frontend builds without TypeScript errors (`npm run build`)
- [ ] All four demo scenarios produce the expected decision from `/score`
- [ ] Audit log has entries under `feature_store/audit_log/`
- [ ] Step-up OTP flow completes successfully end-to-end in the browser
- [ ] SHAP reason codes render legibly in the case drill-down panel for a non-technical reviewer
- [ ] Compliance mapping doc (`docs/compliance_mapping.md`) is complete and cross-checked
- [ ] Full demo rehearsed at least twice end-to-end