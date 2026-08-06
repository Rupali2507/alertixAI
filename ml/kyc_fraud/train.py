"""
Trains the KYC fraud detector: feature engineering -> weak labels ->
CatBoost -> SHAP explainer, wrapped behind the frozen BaseDetector
interface as KYCFraudDetector.
"""

from __future__ import annotations
import os
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, precision_recall_fscore_support

from feature_store.store import read_all
from ml.kyc_fraud.feature_engineering import build_kyc_features, weak_fraud_labels
from ml.kyc_fraud.catboost_model import KYCFraudModel
from ml.kyc_fraud.shap_explainer import KYCShapExplainer
from ml.interfaces.detector_base import BaseDetector
from ml.interfaces.model_schema import DetectorScore

ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
DECISION_THRESHOLD_FOR_METRICS = 0.5


class KYCFraudDetector(BaseDetector):
    name = "kyc"

    def __init__(self):
        self.model = KYCFraudModel()
        self.explainer: KYCShapExplainer | None = None

    def fit(self, events: list[dict]) -> "KYCFraudDetector":
        X, _, _ = build_kyc_features(events)
        if len(X) == 0:
            raise ValueError("No onboarding/KYC events found to train on.")
        y = weak_fraud_labels(X)

        # stratify only when each class has at least 2 members; weak labels
        # may produce very few positives on a small/homogeneous dataset
        unique, counts = np.unique(y, return_counts=True)
        can_stratify = len(unique) > 1 and counts.min() >= 2
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y if can_stratify else None,
        )
        self.model.fit(X_train, y_train, eval_set=(X_val, y_val))
        self.explainer = KYCShapExplainer(self.model.model)

        self._report_metrics(y_val, self.model.predict_proba(X_val))
        return self

    def _report_metrics(self, y_val: np.ndarray, val_probs: np.ndarray) -> None:
        if len(np.unique(y_val)) <= 1:
            print("[kyc_fraud] validation set had only one class present — metrics skipped.")
            return
        preds = (val_probs >= DECISION_THRESHOLD_FOR_METRICS).astype(int)
        auc = roc_auc_score(y_val, val_probs)
        precision, recall, f1, _ = precision_recall_fscore_support(y_val, preds, average="binary", zero_division=0)
        print(f"[kyc_fraud] val AUC={auc:.3f} precision={precision:.3f} recall={recall:.3f} f1={f1:.3f}")
        print(
            "[kyc_fraud] NOTE: these metrics are against WEAK LABELS (feature_engineering.weak_fraud_labels), "
            "not analyst-confirmed fraud — treat as a sanity check that the model recovers the heuristic "
            "signal, not as a true precision/recall estimate. Replace with confirmed case outcomes post-launch."
        )

    def score_event(self, event: dict, context: dict | None = None) -> DetectorScore:
        if event.get("event_type") != "onboarding":
            return DetectorScore(score=0.0, confidence=1.0, reason_codes=[])

        X, _, _ = build_kyc_features([event])
        if len(X) == 0:
            return DetectorScore(score=0.0, confidence=0.5, reason_codes=[])

        x_row = X[0]
        score = float(self.model.predict_proba(x_row.reshape(1, -1))[0])
        reason_codes: list[str] = []
        weights: dict[str, float] = {}
        if self.explainer:
            reason_codes = self.explainer.top_reason_codes(x_row)
            full = self.explainer.full_attribution(x_row)  # raw_feature_name -> signed SHAP value
            from ml.kyc_fraud.shap_explainer import HUMAN_READABLE
            for raw_name, val in full.items():
                code = HUMAN_READABLE.get(raw_name, raw_name)
                if code in reason_codes:
                    weights[code] = round(float(val), 4)
        return DetectorScore(score=round(score, 3), confidence=0.95, reason_codes=reason_codes, reason_code_weights=weights)

    def save(self, path: str) -> None:
        os.makedirs(path, exist_ok=True)
        ext = "cbm" if self.model.backend == "catboost" else "joblib"
        self.model.save(os.path.join(path, f"model.{ext}"))

    @classmethod
    def load(cls, path: str) -> "KYCFraudDetector":
        det = cls()
        cbm_path, joblib_path = os.path.join(path, "model.cbm"), os.path.join(path, "model.joblib")
        det.model = KYCFraudModel.load(cbm_path if os.path.exists(cbm_path) else joblib_path)
        det.explainer = KYCShapExplainer(det.model.model)
        return det


def main():
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    events = read_all().to_dict("records")
    if not events:
        raise RuntimeError("No events in feature store — run ingestion before training.")
    print(f"Training KYC fraud detector on {len(events)} events...")
    detector = KYCFraudDetector().fit(events)
    detector.save(ARTIFACT_DIR)
    print(f"Saved KYC fraud detector artifacts to {ARTIFACT_DIR}")


if __name__ == "__main__":
    main()