"""
Autoencoder-based behavioral anomaly detector.

Trains an unsupervised dense autoencoder on normal-user behavioral feature
vectors (see feature_engineering.py). Anomaly score = reconstruction error,
calibrated against the training-set error distribution so the output is a
percentile-style score in [0, 1] rather than raw MSE (which has no fixed
scale and would break the fusion layer's assumption of a bounded score).

Why an autoencoder in addition to Isolation Forest (isolation_forest.py):
Isolation Forest uses axis-aligned splits and is fast/robust to irrelevant
features, but is weaker on anomalies that only show up as a FEATURE
INTERACTION — e.g. "high txn amount AND new device AND off-hours" together
is far more suspicious than any one alone. An autoencoder learns a
nonlinear joint manifold of "normal" behavior and flags points that don't
reconstruct well anywhere on that manifold, which is a complementary
failure mode — that's why train.py ensembles both rather than picking one.
"""

from __future__ import annotations
import numpy as np

try:
    import torch
    import torch.nn as nn
except ImportError as e:  # pragma: no cover
    raise ImportError(
        "PyTorch is required for ml/behavioral/autoencoder.py. "
        "Install with: pip install torch --break-system-packages"
    ) from e

from ml.behavioral.feature_engineering import N_FEATURES


class _AutoencoderNet(nn.Module):
    def __init__(self, n_features: int, latent_dim: int = 6):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(n_features, 16), nn.ReLU(),
            nn.Linear(16, latent_dim), nn.ReLU(),
        )
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, 16), nn.ReLU(),
            nn.Linear(16, n_features),
        )

    def forward(self, x):
        return self.decoder(self.encoder(x))


class BehavioralAutoencoder:
    """
    Thin sklearn-style wrapper around _AutoencoderNet — fit/anomaly_score,
    with reconstruction-error calibration baked in so scores are comparable
    to the rest of the pipeline ([0, 1]).
    """

    def __init__(self, n_features: int = N_FEATURES, latent_dim: int = 6, lr: float = 1e-3):
        self.n_features = n_features
        self.latent_dim = latent_dim
        self.net = _AutoencoderNet(n_features, latent_dim)
        self.lr = lr
        self._calib_mean: float | None = None
        self._calib_std: float | None = None

    def fit(self, X: np.ndarray, epochs: int = 60, batch_size: int = 64, val_split: float = 0.1):
        """
        Trains on X assuming the vast majority of rows are "normal" behavior
        — standard for unsupervised anomaly detection, and reasonable here
        since fraud/insider-misuse events are a small minority of the event
        stream. Holds out val_split to calibrate the score.
        """
        if len(X) == 0:
            raise ValueError("Cannot fit BehavioralAutoencoder on an empty feature matrix.")

        n_val = max(1, int(len(X) * val_split))
        perm = np.random.permutation(len(X))
        val_idx, train_idx = perm[:n_val], perm[n_val:]
        X_train = torch.tensor(X[train_idx], dtype=torch.float32)
        X_val = torch.tensor(X[val_idx], dtype=torch.float32)

        optimizer = torch.optim.Adam(self.net.parameters(), lr=self.lr, weight_decay=1e-5)
        loss_fn = nn.MSELoss()

        self.net.train()
        for _ in range(epochs):
            perm_e = torch.randperm(len(X_train))
            for start in range(0, len(X_train), batch_size):
                idx = perm_e[start:start + batch_size]
                batch = X_train[idx]
                optimizer.zero_grad()
                recon = self.net(batch)
                loss = loss_fn(recon, batch)
                loss.backward()
                optimizer.step()

        self.net.eval()
        with torch.no_grad():
            recon_val = self.net(X_val)
            errs = ((recon_val - X_val) ** 2).mean(dim=1).numpy()
        self._calib_mean = float(errs.mean())
        self._calib_std = float(errs.std()) or 1e-6
        return self

    def reconstruction_error(self, X: np.ndarray) -> np.ndarray:
        self.net.eval()
        with torch.no_grad():
            x_t = torch.tensor(X, dtype=torch.float32)
            recon = self.net(x_t)
            return ((recon - x_t) ** 2).mean(dim=1).numpy()

    def anomaly_score(self, X: np.ndarray) -> np.ndarray:
        """
        Maps reconstruction error to [0, 1] via a sigmoid centered on the
        calibrated "normal" error distribution: error near the training
        mean -> low score; error several std devs out -> score approaching
        1. Keeps scores stable even as raw MSE scale drifts across retrains.
        """
        if self._calib_mean is None:
            raise RuntimeError("Call fit() before anomaly_score().")
        errs = self.reconstruction_error(X)
        z = (errs - self._calib_mean) / self._calib_std
        return 1.0 / (1.0 + np.exp(-(z - 1.0)))  # z=1 std above baseline -> score ~0.5

    def save(self, path: str) -> None:
        torch.save({
            "state_dict": self.net.state_dict(),
            "n_features": self.n_features,
            "latent_dim": self.latent_dim,
            "calib_mean": self._calib_mean,
            "calib_std": self._calib_std,
        }, path)

    @classmethod
    def load(cls, path: str) -> "BehavioralAutoencoder":
        ckpt = torch.load(path, map_location="cpu")
        model = cls(n_features=ckpt["n_features"], latent_dim=ckpt["latent_dim"])
        model.net.load_state_dict(ckpt["state_dict"])
        model._calib_mean = ckpt["calib_mean"]
        model._calib_std = ckpt["calib_std"]
        return model