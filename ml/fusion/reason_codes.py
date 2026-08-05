"""
Reason-code aggregation for the fused decision.

Each detector emits its own raw reason codes (short machine-readable
strings). This module:
  1. De-duplicates codes that mean the same thing across detectors
     (e.g. behavioral's "new_device" and device_trust's "new_device").
  2. Ranks remaining codes by (a) which detector's score was highest when
     it fired the code and (b) a fixed severity prior, so the dashboard
     shows the most decision-relevant reasons first rather than whatever
     came back in dict-iteration order.
  3. Renders a short human-readable sentence per code — needed for the
     non-technical-reviewer requirement in the plan ("confirm reason codes
     render legibly to a non-technical reviewer").
"""

from __future__ import annotations
from ml.interfaces.model_schema import DetectorScore

# codes considered equivalent across detectors -> canonical code (extend as
# overlaps are found between detectors)
_ALIASES: dict[str, str] = {}

# fixed severity prior, used as a tiebreaker when two codes come from
# equally-scored detectors — hand-curated from domain knowledge of what's
# most decision-relevant to an analyst, not learned from data
_SEVERITY_PRIOR = {
    "large_balance_override": 10, "mass_export_pattern": 10,
    "balance_override": 8, "kyc_field_override": 7,
    "pan_reused_across_accounts": 9, "phone_reused_across_accounts": 8,
    "address_reused_across_accounts": 7, "device_shared_across_many_users": 7,
    "ip_shared_across_many_users": 6, "rapid_kyc_to_transaction": 7,
    "anomalous_vs_peer_cohort": 5,
    "unusual_login_time": 4, "new_device": 4, "kyc_mismatch": 5,
    "rapid_kyc_edit_pattern": 5, "multiple_kyc_edits_recent": 4,
}

_HUMAN_READABLE = {
    "unusual_login_time": "Login at an unusual time for this user",
    "new_device": "First-seen device for this user",
    "kyc_mismatch": "KYC details do not match on file",
    "device_shared_across_many_users": "Device linked to an unusually large number of accounts",
    "ip_shared_across_many_users": "IP address linked to an unusually large number of accounts",
    "pan_reused_across_accounts": "PAN number reused on another account",
    "phone_reused_across_accounts": "Phone number reused on another account",
    "address_reused_across_accounts": "Address reused on another account",
    "rapid_kyc_edit_pattern": "Multiple KYC fields changed in rapid succession",
    "multiple_kyc_edits_recent": "Several KYC edits in the past week",
    "rapid_kyc_to_transaction": "Transaction attempted immediately after a KYC change",
    "balance_override": "Administrator performed a balance override",
    "large_balance_override": "Administrator performed a large balance override",
    "kyc_field_override": "Administrator directly overrode a KYC field",
    "mass_export_pattern": "Administrator performed an unusually high volume of data exports",
    "anomalous_vs_peer_cohort": "Admin activity unusual compared to peers in the same role",
}


def aggregate_reason_codes(sub_scores: dict[str, DetectorScore], top_k: int = 5) -> list[dict]:
    """
    Returns ranked, de-duplicated, human-readable reason codes:
      [{"code": ..., "detector": ..., "detector_score": ..., "description": ...}, ...]
    """
    seen: dict[str, dict] = {}
    for detector_name, s in sub_scores.items():
        for raw_code in s.reason_codes:
            code = _ALIASES.get(raw_code, raw_code)
            entry = seen.get(code)
            if entry is None or s.score > entry["detector_score"]:
                seen[code] = {
                    "code": code,
                    "detector": detector_name,
                    "detector_score": s.score,
                    "description": _HUMAN_READABLE.get(code, code.replace("_", " ").capitalize()),
                }

    ranked = sorted(seen.values(), key=lambda e: (e["detector_score"], _SEVERITY_PRIOR.get(e["code"], 0)), reverse=True)
    return ranked[:top_k]