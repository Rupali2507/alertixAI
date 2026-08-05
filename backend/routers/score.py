"""
FastAPI scoring router.

On startup, attempts to load each real trained detector from its artifacts/
directory.  If the artifact doesn't exist yet (i.e. seed_and_train.py hasn't
been run), it transparently falls back to the mock detector so the API is
always usable during development.

This means:
  - Before training:  score.py uses mocks (random scores, useful for frontend dev)
  - After training:   score.py loads the real models (scores driven by actual
                      feature engineering and learned anomaly signals)

No code changes are needed to switch between the two — just run
  python scripts/seed_and_train.py
then restart uvicorn.
"""

from __future__ import annotations
import os
import logging

from fastapi import APIRouter
from pydantic import BaseModel

from ml.interfaces.model_schema import DetectorScore
from ml.interfaces.mock_detectors import (
    mock_behavioral_score,
    mock_device_trust_score,
    mock_kyc_score,
    mock_insider_misuse_score,
)
from ml.insider_misuse.rules import InsiderMisuseRuleEngine
from backend.orchestrator.decision_engine import build_decision
from backend.privacy.hashing import hash_pii
from backend.privacy.audit_log import write_audit_entry

log = logging.getLogger(__name__)
router = APIRouter()

# ── detector artifact directories ───────────────────────────────────────────
_ML_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "ml")

_BEHAVIORAL_ARTIFACTS   = os.path.join(_ML_ROOT, "behavioral",     "artifacts")
_DEVICE_TRUST_ARTIFACTS = os.path.join(_ML_ROOT, "device_trust",   "artifacts")
_KYC_ARTIFACTS          = os.path.join(_ML_ROOT, "kyc_fraud",      "artifacts")
_INSIDER_ARTIFACTS      = os.path.join(_ML_ROOT, "insider_misuse", "artifacts")


def _has_artifacts(path: str) -> bool:
    return os.path.isdir(path) and any(
        f for f in os.listdir(path)
        if not f.startswith(".")
    )


# ── lazy-load real detectors if trained ─────────────────────────────────────
_behavioral_det   = None
_device_trust_det = None
_kyc_det          = None
_insider_det      = None

def _load_behavioral():
    global _behavioral_det
    if _behavioral_det is not None:
        return _behavioral_det
    if _has_artifacts(_BEHAVIORAL_ARTIFACTS):
        try:
            from ml.behavioral.train import BehavioralDetector
            _behavioral_det = BehavioralDetector.load(_BEHAVIORAL_ARTIFACTS)
            log.info("[score] Loaded real BehavioralDetector from %s", _BEHAVIORAL_ARTIFACTS)
        except Exception as e:
            log.warning("[score] Could not load BehavioralDetector (%s) — using mock", e)
    else:
        log.info("[score] No behavioral artifacts found — using mock detector")
    return _behavioral_det

def _load_device_trust():
    global _device_trust_det
    if _device_trust_det is not None:
        return _device_trust_det
    if _has_artifacts(_DEVICE_TRUST_ARTIFACTS):
        try:
            from ml.device_trust.train import DeviceTrustDetector
            _device_trust_det = DeviceTrustDetector.load(_DEVICE_TRUST_ARTIFACTS)
            log.info("[score] Loaded real DeviceTrustDetector from %s", _DEVICE_TRUST_ARTIFACTS)
        except Exception as e:
            log.warning("[score] Could not load DeviceTrustDetector (%s) — using mock", e)
    else:
        log.info("[score] No device_trust artifacts found — using mock detector")
    return _device_trust_det

def _load_kyc():
    global _kyc_det
    if _kyc_det is not None:
        return _kyc_det
    if _has_artifacts(_KYC_ARTIFACTS):
        try:
            from ml.kyc_fraud.train import KYCFraudDetector
            _kyc_det = KYCFraudDetector.load(_KYC_ARTIFACTS)
            log.info("[score] Loaded real KYCFraudDetector from %s", _KYC_ARTIFACTS)
        except Exception as e:
            log.warning("[score] Could not load KYCFraudDetector (%s) — using mock", e)
    else:
        log.info("[score] No kyc_fraud artifacts found — using mock detector")
    return _kyc_det

def _load_insider():
    global _insider_det
    if _insider_det is not None:
        return _insider_det
    if _has_artifacts(_INSIDER_ARTIFACTS):
        try:
            from ml.insider_misuse.cohort_isolation_forest import CohortIsolationForestDetector
            _insider_det = CohortIsolationForestDetector.load(_INSIDER_ARTIFACTS)
            log.info("[score] Loaded real CohortIsolationForestDetector from %s", _INSIDER_ARTIFACTS)
        except Exception as e:
            log.warning("[score] Could not load CohortIsolationForestDetector (%s) — using mock", e)
    else:
        log.info("[score] No insider_misuse artifacts found — using mock detector")
    return _insider_det


# ── shared rule engine (always active, regardless of statistical model) ──────
_rule_engine = InsiderMisuseRuleEngine()


# ── scoring helpers ──────────────────────────────────────────────────────────

def _score_behavioral(event: dict) -> DetectorScore:
    det = _load_behavioral()
    if det is not None:
        return det.score_event(event)
    return mock_behavioral_score(event)


def _score_device_trust(event: dict) -> DetectorScore:
    det = _load_device_trust()
    if det is not None:
        return det.score_event(event)
    return mock_device_trust_score(event)


def _score_kyc(event: dict) -> DetectorScore:
    det = _load_kyc()
    if det is not None:
        return det.score_event(event)
    return mock_kyc_score(event)


def _score_insider(event: dict) -> DetectorScore:
    violations = _rule_engine.evaluate(event)
    det = _load_insider()
    if det is not None:
        # real CohortIsolationForestDetector already calls the rule engine
        # internally, so use it directly
        return det.score_event(event)
    return mock_insider_misuse_score(event, violations)


# ── request model ─────────────────────────────────────────────────────────────

class ScoreRequest(BaseModel):
    event: dict  # matches ingestion/schemas/event_schema.json


# ── individual endpoints ──────────────────────────────────────────────────────

@router.post("/score/behavioral")
def score_behavioral(req: ScoreRequest) -> DetectorScore:
    return _score_behavioral(req.event)


@router.post("/score/device_trust")
def score_device_trust(req: ScoreRequest) -> DetectorScore:
    return _score_device_trust(req.event)


@router.post("/score/kyc")
def score_kyc(req: ScoreRequest) -> DetectorScore:
    return _score_kyc(req.event)


@router.post("/score/insider_misuse")
def score_insider_misuse(req: ScoreRequest) -> DetectorScore:
    return _score_insider(req.event)


# ── combined endpoint ─────────────────────────────────────────────────────────

@router.post("/score")
def score_combined(req: ScoreRequest):
    """
    Main scoring endpoint.  Returns a FusedScore with:
      - fused_score   in [0, 1]
      - decision      "allow" | "step_up" | "block"
      - sub_scores    {behavioral, device_trust, kyc, insider_misuse}
      - reason_codes  ranked, de-duplicated, human-readable strings

    Also writes a PII-safe audit-log entry for every decision.
    """
    raw_event = req.event

    sub_scores = {
        "behavioral":    _score_behavioral(raw_event),
        "device_trust":  _score_device_trust(raw_event),
        "kyc":           _score_kyc(raw_event),
        "insider_misuse": _score_insider(raw_event),
    }
    result = build_decision(sub_scores)

    # audit log — user_id is hashed before persisting (Phase 4 compliance)
    user_id_hash = hash_pii(str(raw_event.get("user_id", "")))
    write_audit_entry(
        event_id=raw_event.get("event_id", "unknown"),
        user_id_hash=user_id_hash,
        decision=result.decision,
        sub_scores=result.sub_scores,
        fused_score=result.fused_score,
        reason_codes=result.reason_codes,
    )

    return result