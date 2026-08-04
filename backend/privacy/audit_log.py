import os
import json
from datetime import datetime, timezone

AUDIT_LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "feature_store", "audit_log")
os.makedirs(AUDIT_LOG_DIR, exist_ok=True)

POLICY_VERSION = "v1.0"

def write_audit_entry(
    event_id: str,
    user_id_hash: str,
    decision: str,
    sub_scores: dict,
    fused_score: float,
    reason_codes: list[str],
    consent_basis: str = "legitimate_interest",
):
    """
    Appends one audit entry as a JSON line (JSONL format — easy to append,
    easy to stream, easy for Rupali's audit dashboard to consume later).
    """
    entry = {
        "event_id": event_id,
        "user_id_hash": user_id_hash,  # never raw user_id — privacy by design
        "decision": decision,
        "sub_scores": {k: v.dict() if hasattr(v, "dict") else v for k, v in sub_scores.items()},
        "fused_score": fused_score,
        "reason_codes": reason_codes,
        "policy_version": POLICY_VERSION,
        "consent_basis": consent_basis,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filepath = os.path.join(AUDIT_LOG_DIR, f"audit_{date_str}.jsonl")

    with open(filepath, "a") as f:
        f.write(json.dumps(entry) + "\n")

    return entry

def read_audit_log(date_str: str = None) -> list[dict]:
    """Read all audit entries for a given date (defaults to today)."""
    if date_str is None:
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filepath = os.path.join(AUDIT_LOG_DIR, f"audit_{date_str}.jsonl")
    if not os.path.exists(filepath):
        return []
    with open(filepath) as f:
        return [json.loads(line) for line in f if line.strip()]