import random
from ml.interfaces.model_schema import DetectorScore

def mock_behavioral_score(event: dict) -> DetectorScore:
    score = random.betavariate(2, 8)  # skewed low, occasional spikes
    return DetectorScore(
        score=round(score, 3),
        confidence=0.9,
        reason_codes=["unusual_login_time"] if score > 0.6 else [],
    )

def mock_device_trust_score(event: dict) -> DetectorScore:
    score = random.betavariate(2, 8)
    return DetectorScore(
        score=round(score, 3),
        confidence=0.85,
        reason_codes=["new_device"] if score > 0.6 else [],
    )

def mock_kyc_score(event: dict) -> DetectorScore:
    score = random.betavariate(2, 10)
    return DetectorScore(
        score=round(score, 3),
        confidence=0.95,
        reason_codes=["kyc_mismatch"] if score > 0.6 else [],
    )

def mock_insider_misuse_score(event: dict, rule_violations: list) -> DetectorScore:
    # if rule engine flagged something, force score high
    if rule_violations:
        max_severity_score = {"low": 0.4, "medium": 0.6, "high": 0.8, "critical": 0.95}
        score = max(max_severity_score.get(v.severity, 0.5) for v in rule_violations)
        codes = [v.rule_name for v in rule_violations]
    else:
        score = random.betavariate(1, 15)  # very low baseline
        codes = []
    return DetectorScore(score=round(score, 3), confidence=1.0, reason_codes=codes)