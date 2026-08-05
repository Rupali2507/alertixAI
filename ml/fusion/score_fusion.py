"""
Score fusion: combines the four detector outputs (behavioral, device_trust,
kyc, insider_misuse) into one fused risk score.

Two fusion strategies, matching the plan (weighted average first,
meta-classifier if time allows):

1. WeightedAverageFusion — the baseline, config-driven (weights live in
   backend/orchestrator/config.py, not hardcoded here, so ops can retune
   without a redeploy). Transparent and auditable — every weight is
   inspectable, which matters far more for the compliance narrative
   (docs/compliance_mapping.md) than a marginal AUC gain would.

2. MetaClassifierFusion — a logistic-regression model trained on
   (sub_scores, confidences) -> outcome, learning nonlinear interactions
   fixed weights can't express (e.g. "high device_trust risk is much
   scarier when kyc risk is also elevated" is multiplicative, not additive).
   Falls back to the weighted average automatically when untrained or given
   too little data — a meta-classifier trained on a handful of cases would
   just overfit noise, so the fallback isn't a nicety, it's the correct
   behavior for a cold-start system.

Both expose the same `.fuse(sub_scores) -> float` contract so the
orchestrator (backend/orchestrator/decision_engine.py) can swap strategies
via config without any other code changing.
"""

from __future__ import annotations
import numpy as np

from ml.interfaces.model_schema import DetectorScore

DETECTOR_ORDER = ("behavioral", "device_trust", "kyc", "insider_misuse")


class WeightedAverageFusion:
    def __init__(self, weights: dict[str, float]):
        missing = set(DETECTOR_ORDER) - set(weights)
        if missing:
            raise ValueError(f"WeightedAverageFusion missing weights for: {missing}")
        total = sum(weights.values())
        self.weights = {k: v / total for k, v in weights.items()}  # normalize defensively

    def fuse(self, sub_scores: dict[str, DetectorScore]) -> float:
        # confidence-weight each detector's contribution too: a low-confidence
        # score (e.g. insider_misuse cold-started with no cohort model yet)
        # should count for less than its nominal config weight
        weighted_sum, weight_total = 0.0, 0.0
        for name in DETECTOR_ORDER:
            if name not in sub_scores:
                continue
            s = sub_scores[name]
            w = self.weights[name] * s.confidence
            weighted_sum += s.score * w
            weight_total += w
        return round(weighted_sum / weight_total, 3) if weight_total > 0 else 0.0


class MetaClassifierFusion:
    """
    Logistic-regression meta-learner over [score_i, confidence_i] for each
    detector. Requires historical (sub_scores -> outcome) pairs to train,
    which won't exist until the audit log (backend/privacy/audit_log.py)
    has accumulated analyst-confirmed outcomes — until then, `fuse()`
    transparently defers to the weighted-average fallback.
    """

    MIN_TRAINING_EXAMPLES = 200  # below this, a learned meta-model is more likely to overfit than help

    def __init__(self, fallback: WeightedAverageFusion):
        self.fallback = fallback
        self.model = None

    def fit(self, sub_score_history: list[dict[str, DetectorScore]], y: np.ndarray) -> "MetaClassifierFusion":
        if len(sub_score_history) < self.MIN_TRAINING_EXAMPLES:
            print(
                f"[fusion] only {len(sub_score_history)} labeled cases available "
                f"(<{self.MIN_TRAINING_EXAMPLES}) — staying on weighted-average fusion."
            )
            return self

        from sklearn.linear_model import LogisticRegression
        X = np.vstack([self._to_feature_row(s) for s in sub_score_history])
        self.model = LogisticRegression(max_iter=1000, class_weight="balanced").fit(X, y)
        return self

    def _to_feature_row(self, sub_scores: dict[str, DetectorScore]) -> np.ndarray:
        row = []
        for name in DETECTOR_ORDER:
            s = sub_scores.get(name)
            row.extend([s.score if s else 0.0, s.confidence if s else 0.0])
        return np.array(row, dtype=np.float32).reshape(1, -1)

    def fuse(self, sub_scores: dict[str, DetectorScore]) -> float:
        if self.model is None:
            return self.fallback.fuse(sub_scores)
        return round(float(self.model.predict_proba(self._to_feature_row(sub_scores))[0, 1]), 3)


class ScoreFusion:
    """Top-level fusion entry point — the object the orchestrator instantiates."""

    def __init__(self, weights: dict[str, float], use_meta_classifier: bool = False):
        self.weighted_avg = WeightedAverageFusion(weights)
        self.meta = MetaClassifierFusion(self.weighted_avg) if use_meta_classifier else None

    def fuse(self, sub_scores: dict[str, DetectorScore]) -> float:
        return self.meta.fuse(sub_scores) if self.meta is not None else self.weighted_avg.fuse(sub_scores)