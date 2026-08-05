# AlertixAI — Compliance Mapping

Maps specific AlertixAI system features to regulatory requirements under:
- **RBI Cybersecurity Framework** (Master Direction on IT, 2023)
- **DPDP Act, 2023** (Digital Personal Data Protection Act)
- **GDPR** (EU General Data Protection Regulation — for completeness)

---

## RBI Cybersecurity Framework

| Requirement | RBI Provision | AlertixAI Feature |
|---|---|---|
| Continuous authentication for high-value transactions | §4.3 — Secure Application Life Cycle | `/score` endpoint evaluates every event; step-up auth triggered for risk score 0.35–0.70 |
| Anomaly detection and real-time alerting | §4.5 — Cyber Crisis Management Plan | Behavioral + Device Trust detectors score every login/txn in real time; `decision: block` events are audit-logged immediately |
| Privileged access monitoring | §4.8 — Access Control | Insider misuse detector monitors all `admin_action` events; deterministic rule engine catches balance overrides and mass exports within seconds |
| Multi-factor authentication for privileged users | §4.6 — Authentication Framework | Step-up auth (OTP / FIDO2 biometric / liveness) triggered by elevated risk scores, not only for admins but for any event above threshold |
| Audit logs with tamper evidence | §5.3 — Audit Trail | `backend/privacy/audit_log.py` writes every decision with: event_id, hashed user_id, sub-scores, fused score, reason codes, policy version, timestamp, purpose basis |
| Vendor/third-party risk management | §6 — IT Service Management | Scoring service is stateless and deployable behind a load balancer; no third-party ML API calls — all inference is on-premise |
| Customer data localisation | Master Direction §3.4 | Feature store and audit log write to local Parquet files; no data leaves the deployment boundary |

---

## DPDP Act, 2023

| Requirement | DPDP Section | AlertixAI Feature |
|---|---|---|
| Lawful purpose for processing | §4 — Grounds for Processing | Fraud prevention and security are recognised as legitimate purposes; purpose basis field is written to every audit-log entry |
| Data minimisation | §6(1) | Only event metadata (device ID, IP, timestamps, action type) is processed — no raw biometrics, no document images |
| PII pseudonymisation | §8(2) — Security Safeguards | `backend/privacy/hashing.py`: salted HMAC-SHA256 hashes user_id, device_id, ip_address, beneficiary_id before they enter the feature store or audit log |
| Purpose limitation | §6(2) | Feature store schema records `purpose_basis` on each batch write; models are trained only on fraud-detection features, not profiling |
| Right to erasure (right to be forgotten) | §13 | Audit log entries use hashed user IDs — once the salt is rotated, historic entries are irreversibly de-linked from the data principal |
| Data accuracy | §10 | Weak labels used in training are explicitly documented as heuristic proxies (see `ml/kyc_fraud/train.py`); the system outputs a confidence score alongside each decision, not a binary label |
| Grievance redressal | §13(6) | Audit log stores reason codes and policy version so any blocked decision can be explained to the data principal |

---

## GDPR (Reference)

| Principle | GDPR Article | AlertixAI Feature |
|---|---|---|
| Lawfulness, fairness, transparency | Art. 5(1)(a) | Risk scores are explainable via SHAP reason codes; decision rationale is stored in audit log |
| Purpose limitation | Art. 5(1)(b) | Same as DPDP — purpose basis recorded per decision |
| Data minimisation | Art. 5(1)(c) | No raw PII processed beyond device/IP/action-type metadata |
| Accuracy | Art. 5(1)(d) | Confidence scores indicate model certainty; step-up auth is preferred over hard blocks for mid-range scores |
| Storage limitation | Art. 5(1)(e) | Parquet partitions are date-scoped; salt rotation severs historic linkability without deleting records |
| Integrity and confidentiality | Art. 5(1)(f) | Salted HMAC hashing + differential-privacy noise on training aggregates (`backend/privacy/differential_privacy.py`) |
| Right to explanation (automated decisions) | Art. 22 | SHAP waterfall rendered in dashboard; reason codes stored per decision in audit log; human analyst must confirm blocks before downstream action |

---

## Differential Privacy Note

`backend/privacy/differential_privacy.py` uses `diffprivlib` to inject
calibrated Laplace noise into training aggregates before the Isolation Forest
models see them. This provides ε-differential privacy for the training data,
ensuring that no individual event's presence or absence can be inferred from
the trained model weights.

The ε parameter is set conservatively at **ε = 1.0** for demo purposes.
In production, this should be tuned based on the sensitivity of the
aggregate features and the regulatory guidance applicable at time of deployment.
