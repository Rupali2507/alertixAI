"""
Trains the behavioral detector ensemble (Isolation Forest + Autoencoder)
and wraps it behind the frozen BaseDetector interface
(ml/interfaces/detector_base.py) as BehavioralDetector — this is the object
Ratnesh will import in backend/routers/score.py in place of
ml.interfaces.mock_detectors.mock_behavioral_score.

Ensemble strategy: max(autoencoder_score, isolation_forest_score) rather
than average. The two models fail on different anomaly shapes (see
autoencoder.py docstring), so taking the max means only ONE of the two
needs to catch a given anomaly pattern for it to surface — this trades a
little precision for meaningfully better recall, the right tradeoff for a
fraud-alerting system where a missed detection is costlier than an extra
analyst review.
"""

from __future__ import annotations
import os
import numpy as np

from feature_store.store import read_all
from ml.behavioral.feature_engineering import (
    build_feature_matrix, compute_features, UserBehaviorHistory,
)
from ml.behavioral.isolation_forest import BehavioralIsolationForest
from ml.interfaces.detector_base import BaseDetector
from ml.interfaces.model_schema import DetectorScore

ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
REASON_CODE_THRESHOLD = 0.6  # score above this contributes reason codes to the fused decision


class BehavioralDetector(BaseDetector):
    name = "behavioral"

    def __init__(self):
        self.iso_forest = BehavioralIsolationForest()
        self.autoencoder = None  # lazy: torch is an optional heavy dependency
        self.history = UserBehaviorHistory()
        self._train_features: np.ndarray | None = None

    def fit(self, events: list[dict]) -> "BehavioralDetector":
        X, _ = build_feature_matrix(events)
        self._train_features = X
        self.iso_forest.fit(X)

        try:
            from ml.behavioral.autoencoder import BehavioralAutoencoder
            self.autoencoder = BehavioralAutoencoder().fit(X)
        except ImportError:
            print("[behavioral] torch not installed — falling back to Isolation-Forest-only scoring.")
            self.autoencoder = None

        # replay events into live history so score_event() has state for
        # velocity features immediately after training (no cold start in demo)
        for e in sorted(events, key=lambda e: e["timestamp"]):
            self.history.observe(e)
        return self

    def score_event(self, event: dict, context: dict | None = None) -> DetectorScore:
        x = compute_features(event, self.history).reshape(1, -1)

        iso_score = float(self.iso_forest.anomaly_score(x)[0])
        if self.autoencoder is not None:
            ae_score = float(self.autoencoder.anomaly_score(x)[0])
            score = max(iso_score, ae_score)
        else:
            score = iso_score

        reason_codes = []
        if score > REASON_CODE_THRESHOLD and self._train_features is not None:
            reason_codes = self.iso_forest.top_contributing_features(x[0], self._train_features, top_k=2)

        # update history AFTER scoring so subsequent features stay causal/online-safe
        self.history.observe(event)

        confidence = 0.9 if self.autoencoder is not None else 0.75
        return DetectorScore(score=round(score, 3), confidence=confidence, reason_codes=reason_codes)

    def save(self, path: str) -> None:
        os.makedirs(path, exist_ok=True)
        self.iso_forest.save(os.path.join(path, "isolation_forest.joblib"))
        if self.autoencoder is not None:
            self.autoencoder.save(os.path.join(path, "autoencoder.pt"))

    @classmethod
    def load(cls, path: str) -> "BehavioralDetector":
        det = cls()
        det.iso_forest = BehavioralIsolationForest.load(os.path.join(path, "isolation_forest.joblib"))
        ae_path = os.path.join(path, "autoencoder.pt")
        if os.path.exists(ae_path):
            from ml.behavioral.autoencoder import BehavioralAutoencoder
            det.autoencoder = BehavioralAutoencoder.load(ae_path)
        return det


def main():
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    events = read_all().to_dict("records")
    if not events:
        raise RuntimeError("No events in feature store — run ingestion (scripts/run_demo.sh) before training.")
    print(f"Training behavioral detector on {len(events)} events...")
    detector = BehavioralDetector().fit(events)
    detector.save(ARTIFACT_DIR)
    print(f"Saved behavioral detector artifacts to {ARTIFACT_DIR}")


if __name__ == "__main__":
    main()