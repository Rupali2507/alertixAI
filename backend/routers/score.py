from fastapi import APIRouter
from pydantic import BaseModel
from ml.interfaces.mock_detectors import (
    mock_behavioral_score,
    mock_device_trust_score,
    mock_kyc_score,
    mock_insider_misuse_score,
)
from ml.insider_misuse.rules import InsiderMisuseRuleEngine
from backend.orchestrator.decision_engine import build_decision
from backend.privacy.hashing import hash_event_pii, hash_pii
from backend.privacy.audit_log import write_audit_entry

router = APIRouter()
rule_engine = InsiderMisuseRuleEngine()

class ScoreRequest(BaseModel):
    event: dict  # matches the RawEvent schema from ingestion

@router.post("/score/behavioral")
def score_behavioral(req: ScoreRequest):
    return mock_behavioral_score(req.event)

@router.post("/score/device_trust")
def score_device_trust(req: ScoreRequest):
    return mock_device_trust_score(req.event)

@router.post("/score/kyc")
def score_kyc(req: ScoreRequest):
    return mock_kyc_score(req.event)

@router.post("/score/insider_misuse")
def score_insider_misuse(req: ScoreRequest):
    violations = rule_engine.evaluate(req.event)
    return mock_insider_misuse_score(req.event, violations)

@router.post("/score")
def score_combined(req: ScoreRequest):
    raw_event = req.event

    violations = rule_engine.evaluate(raw_event)
    sub_scores = {
        "behavioral": mock_behavioral_score(raw_event),
        "device_trust": mock_device_trust_score(raw_event),
        "kyc": mock_kyc_score(raw_event),
        "insider_misuse": mock_insider_misuse_score(raw_event, violations),
    }
    result = build_decision(sub_scores)

    user_id_hash = hash_pii(raw_event.get("user_id"))
    write_audit_entry(
        event_id=raw_event.get("event_id", "unknown"),
        user_id_hash=user_id_hash,
        decision=result.decision,
        sub_scores=result.sub_scores,
        fused_score=result.fused_score,
        reason_codes=result.reason_codes,
    )

    return result