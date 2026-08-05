# AlertixAI — Scope Statement

**Project:** Identity Trust Framework for Digital Banking  
**Team:** Muskan (ML) · Ratnesh (Backend) · Rupali (Frontend)  
**Date:** 2026-08-05

---

## What we are building

AlertixAI is a **continuous, risk-based, privacy-preserving Identity Trust Framework** for digital banking.
It assigns a real-time composite risk score to every customer and administrator event (login, transaction,
KYC onboarding, admin action) and routes the event to one of three outcomes:

| Decision | Fused Score | User Experience |
|---|---|---|
| **Allow** | < 0.35 | Seamless pass-through |
| **Step-up** | 0.35 – 0.70 | Additional verification (OTP / biometric / liveness) |
| **Block** | ≥ 0.70 | Access denied, analyst alerted |

The framework is designed to reduce **account takeover**, **KYC fraud**, and **insider misuse** while
keeping friction invisible for low-risk users.

---

## Risk categories — fully built vs architected-only

| Category | Status | Detector |
|---|---|---|
| **Anomalous behavioural sessions** | ✅ **Fully built** | Isolation Forest + Autoencoder ensemble |
| **New / suspicious device usage** | ✅ **Fully built** | GraphSAGE/GAT link-prediction GNN |
| **KYC / onboarding fraud** | ✅ **Fully built** | CatBoost + SHAP explainability |
| **Insider / privileged access misuse** | ✅ **Fully built** | Per-cohort Isolation Forest + deterministic rule engine |

All four detectors are fully implemented. Score fusion uses a confidence-weighted average
(with a meta-classifier upgrade path once labelled outcomes accumulate in the audit log).

---

## Out of scope (for this demo)

- Real Kafka cluster (replaced by Redis Streams / in-process for demo)
- Production secrets management (salt is env-var driven; demo uses a fixed default)
- Analyst feedback loop retraining (audit log schema is designed for it; automation is future work)
- Multi-tenant isolation (single-bank deployment)
