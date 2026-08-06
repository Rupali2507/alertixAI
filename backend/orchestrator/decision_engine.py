from ml.interfaces.model_schema import DetectorScore, FusedScore
from ml.fusion.score_fusion import ScoreFusion
from ml.fusion.reason_codes import aggregate_reason_codes
from backend.orchestrator.config import config


def _build_fusion() -> ScoreFusion:
    """
    Rebuilt per-call (cheap: just wraps config floats) so that live weight
    edits in backend/orchestrator/config.py take effect without a redeploy,
    matching the "config-driven, ops-adjustable" claim in the README.
    """
    w = config.fusion_weights
    return ScoreFusion(
        weights={
            "behavioral": w.behavioral,
            "device_trust": w.device_trust,
            "kyc": w.kyc,
            "insider_misuse": w.insider_misuse,
        },
        use_meta_classifier=False,  # flip to True once MetaClassifierFusion has ≥200 labeled outcomes
    )


def fuse_scores(sub_scores: dict[str, DetectorScore]) -> float:
    """
    Now goes through WeightedAverageFusion, which confidence-weights each
    detector's contribution — a cold-started detector (confidence=0) no
    longer silently drags the fused score using its nominal config weight.
    """
    return _build_fusion().fuse(sub_scores)


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

    # De-duplicated, severity-ranked, human-readable reason codes — this is
    # what makes the dashboard show "Login at an unusual time for this user"
    # instead of the raw machine code "unusual_login_time".
    ranked = aggregate_reason_codes(sub_scores)
    reason_codes = [r["description"] for r in ranked]

    return FusedScore(
        fused_score=fused,
        sub_scores=sub_scores,
        decision=decision,
        reason_codes=reason_codes,
    )