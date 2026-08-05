"""
Isolation Forest behavioral detector — the fast, robust half of the
behavioral ensemble (see autoencoder.py for why both models are used).

sklearn's IsolationForest already returns a usefully-scaled anomaly score
via `score_samples`, but that scale isn't [0, 1] and isn't stable across
retrains/dataset sizes, so we calibrate against the training distribution
the same way the autoencoder does — this keeps both sub-models comparable
and swappable in the ensemble regardless of how each is retrained.
"""

from __future__ import annotations
import numpy as np
from sklearn.ensemble import IsolationForest

from ml.behavioral.feature_engineering import FEATURE_NAMES


class BehavioralIsolationForest:
    def __init__(self, n_estimators: int = 200, contamination="auto", random_state: int = 42):
        self.model = IsolationForest(
            n_estimators=n_estimators,
            contamination=contamination,
            max_samples="auto",
            random_state=random_state,
            n_jobs=-1,
        )
        self._calib_mean: float | None = None
        self._calib_std: float | None = None

    def fit(self, X: np.ndarray) -> "BehavioralIsolationForest":
        if len(X) == 0:
            raise ValueError("Cannot fit BehavioralIsolationForest on an empty feature matrix.")
        self.model.fit(X)
        raw = self.model.score_samples(X)  # higher = more normal
        self._calib_mean = float(raw.mean())
        self._calib_std = float(raw.std()) or 1e-6
        return self

    def anomaly_score(self, X: np.ndarray) -> np.ndarray:
        if self._calib_mean is None:
            raise RuntimeError("Call fit() before anomaly_score().")
        raw = self.model.score_samples(X)  # higher = more normal
        z = (self._calib_mean - raw) / self._calib_std  # flip sign: higher z = more anomalous
        return 1.0 / (1.0 + np.exp(-(z - 1.0)))  # z=1 std above baseline -> score ~0.5

    def top_contributing_features(self, x_row: np.ndarray, baseline: np.ndarray, top_k: int = 3) -> list[str]:
        """
        Isolation Forest has no native SHAP-style attribution, so we
        approximate "what made this point unusual" with a per-feature
        deviation-from-baseline z-score — cheap, interpretable, and good
        enough for reason codes at the fusion layer (ml/fusion/reason_codes.py
        does the final human-readable formatting).
        """
        mean = baseline.mean(axis=0)
        std = baseline.std(axis=0) + 1e-6
        dev = np.abs((x_row - mean) / std)
        top_idx = np.argsort(dev)[::-1][:top_k]
        return [FEATURE_NAMES[i] for i in top_idx]

    def save(self, path: str) -> None:
        import joblib
        joblib.dump({
            "model": self.model,
            "calib_mean": self._calib_mean,
            "calib_std": self._calib_std,
        }, path)

    @classmethod
    def load(cls, path: str) -> "BehavioralIsolationForest":
        import joblib
        ckpt = joblib.load(path)
        obj = cls()
        obj.model = ckpt["model"]
        obj._calib_mean = ckpt["calib_mean"]
        obj._calib_std = ckpt["calib_std"]
        return obj