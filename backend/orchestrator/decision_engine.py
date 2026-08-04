from ml.interfaces.model_schema import DetectorScore, FusedScore
from backend.orchestrator.config import config

def fuse_scores(sub_scores: dict[str, DetectorScore]) -> float:
    weights = config.fusion_weights
    weight_map = {
        "behavioral": weights.behavioral,
        "device_trust": weights.device_trust,
        "kyc": weights.kyc,
        "insider_misuse": weights.insider_misuse,
    }
    total = sum(sub_scores[k].score * weight_map[k] for k in sub_scores if k in weight_map)
    return round(total, 3)

def decide(fused_score: float) -> str:
    t = config.thresholds
    if fused_score < t.allow_max:
        return "allow"
    elif fused_score < t.step_up_max:
        return "step_up"
    else:
        return "block"

def build_decision(sub_scores: dict[str, DetectorScore]) -> FusedScore:
    fused = fuse_scores(sub_scores)
    decision = decide(fused)
    reason_codes = []
    for detector_name, s in sub_scores.items():
        reason_codes.extend(s.reason_codes)

    return FusedScore(
        fused_score=fused,
        sub_scores=sub_scores,
        decision=decision,
        reason_codes=reason_codes,
    )