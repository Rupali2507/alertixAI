"""
CatBoost (gradient-boosted trees) classifier for KYC/onboarding fraud.

CatBoost is chosen over plain LightGBM/XGBoost for this specific detector
because KYC data is disproportionately categorical (which field changed,
document type) and CatBoost's native categorical handling (ordered target
statistics) avoids the target leakage that naive one-hot/label encoding of
high-cardinality categoricals can introduce.

Falls back to sklearn's GradientBoostingClassifier if catboost isn't
installed, so the rest of the pipeline (train.py, shap_explainer.py) keeps
working in a minimal environment — SHAP's TreeExplainer supports both.
"""

from __future__ import annotations
import numpy as np

try:
    from catboost import CatBoostClassifier as _Classifier
    _HAS_CATBOOST = True
except ImportError:
    from sklearn.ensemble import GradientBoostingClassifier as _Classifier
    _HAS_CATBOOST = False


class KYCFraudModel:
    def __init__(self, iterations: int = 300, depth: int = 5, learning_rate: float = 0.05):
        if _HAS_CATBOOST:
            self.model = _Classifier(
                iterations=iterations,
                depth=depth,
                learning_rate=learning_rate,
                loss_function="Logloss",
                eval_metric="AUC",
                verbose=False,
                random_seed=42,
            )
        else:
            print("[kyc_fraud] catboost not installed — falling back to sklearn GradientBoostingClassifier.")
            self.model = _Classifier(
                n_estimators=iterations, max_depth=depth, learning_rate=learning_rate, random_state=42,
            )
        self.backend = "catboost" if _HAS_CATBOOST else "sklearn_gbdt"

    def fit(self, X: np.ndarray, y: np.ndarray, eval_set: tuple[np.ndarray, np.ndarray] | None = None):
        if len(np.unique(y)) < 2:
            raise ValueError(
                "KYCFraudModel needs both classes present in y — weak labels produced only one class. "
                "Check weak_fraud_labels() thresholds or feed more/varied training events."
            )
        if _HAS_CATBOOST:
            pos_rate = y.mean()
            self.model.set_params(class_weights=[1.0, max((1 - pos_rate) / max(pos_rate, 1e-3), 1.0)])
            self.model.fit(X, y, eval_set=eval_set, use_best_model=eval_set is not None)
        else:
            self.model.fit(X, y)
        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        return self.model.predict_proba(X)[:, 1]

    def save(self, path: str) -> None:
        if _HAS_CATBOOST:
            self.model.save_model(path)
        else:
            import joblib
            joblib.dump(self.model, path)

    @classmethod
    def load(cls, path: str) -> "KYCFraudModel":
        obj = cls()
        if _HAS_CATBOOST:
            obj.model.load_model(path)
        else:
            import joblib
            obj.model = joblib.load(path)
        return obj