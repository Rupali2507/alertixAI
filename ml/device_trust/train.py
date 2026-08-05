"""
Trains the device-trust GNN via self-supervised link prediction on the
user-device-IP graph (see graph_builder.py, graphsage_gat.py for the "why").

Training objective: binary cross-entropy between real (user, device) edges
(positive) and randomly sampled non-existent (user, device) pairs
(negative) — the model learns what a "typical" user-device relationship
looks like structurally.

At inference, DeviceTrustDetector scores a (user, device) pairing by:
  1. If the pair is a known, established edge -> the learned link score
     directly reflects how structurally "normal" that relationship is.
  2. If the device is brand-new for this user -> fall back to a moderate
     default risk (the GNN has no edge to score yet), refined by explicit
     fan-out guardrails below.
  3. Regardless of (1)/(2): if the device or IP is shared across an
     unusually large number of otherwise-unrelated users (device-farm /
     SIM-farm signature), add an explicit risk bonus. This is intentional
     defense-in-depth — a compliance-sensitive detector shouldn't rely
     solely on a learned model's judgment for a well-understood structural
     red flag that can be checked directly and cheaply.
"""

from __future__ import annotations
import os
import random

import numpy as np

from feature_store.store import read_all
from ml.interfaces.detector_base import BaseDetector
from ml.interfaces.model_schema import DetectorScore

ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
FANOUT_RISK_THRESHOLD = 8  # devices/IPs shared by more than this many otherwise-unrelated users are suspicious


class DeviceTrustDetector(BaseDetector):
    name = "device_trust"

    def __init__(self):
        self.graph = None
        self.model = None

    def fit(self, events: list[dict], epochs: int = 100, lr: float = 1e-2, neg_ratio: int = 2) -> "DeviceTrustDetector":
        from ml.device_trust.graph_builder import IdentityGraph
        from ml.device_trust.graphsage_gat import DeviceTrustGNN
        import torch

        self.graph = IdentityGraph().build_from_events(events)
        data = self.graph.to_hetero_data()
        self.model = DeviceTrustGNN()
        optimizer = torch.optim.Adam(self.model.parameters(), lr=lr, weight_decay=1e-5)

        pos_edges = data[("user", "uses", "device")].edge_index.t().tolist() if ("user", "uses", "device") in data.edge_types else []
        n_users, n_devices = self.graph.num_nodes("user"), self.graph.num_nodes("device")
        pos_set = {tuple(e) for e in pos_edges}

        if not pos_edges or n_users < 2 or n_devices < 2:
            print("[device_trust] not enough (user, device) structure to train a GNN — model left untrained.")
            return self

        self.model.train()
        for _ in range(epochs):
            optimizer.zero_grad()
            embeddings = self.model(data.x_dict, data.edge_index_dict)

            neg_edges = []
            attempts = 0
            while len(neg_edges) < len(pos_edges) * neg_ratio and attempts < len(pos_edges) * neg_ratio * 20:
                u, d = random.randrange(n_users), random.randrange(n_devices)
                if (u, d) not in pos_set:
                    neg_edges.append((u, d))
                attempts += 1
            if not neg_edges:
                continue

            pos_scores = torch.stack([self.model.link_logit(embeddings, "user", u, "device", d) for u, d in pos_edges])
            neg_scores = torch.stack([self.model.link_logit(embeddings, "user", u, "device", d) for u, d in neg_edges])

            labels = torch.cat([torch.ones_like(pos_scores), torch.zeros_like(neg_scores)])
            scores = torch.cat([pos_scores, neg_scores])
            loss = torch.nn.functional.binary_cross_entropy_with_logits(scores, labels)
            loss.backward()
            optimizer.step()

        return self

    def score_event(self, event: dict, context: dict | None = None) -> DetectorScore:
        user_id, device_id, ip = event.get("user_id"), event.get("device_id"), event.get("ip_address")
        reason_codes: list[str] = []

        if self.graph is None:
            return DetectorScore(score=0.0, confidence=0.0, reason_codes=["device_trust_model_not_fitted"])

        u_idx = self.graph.node_id("user", user_id)
        d_idx = self.graph.node_id("device", device_id) if device_id else None
        is_new_device = d_idx is None

        device_fanout = self.graph.degree("device", device_id) if device_id else 0
        ip_fanout = self.graph.degree("ip", ip) if ip else 0
        if device_fanout > FANOUT_RISK_THRESHOLD:
            reason_codes.append("device_shared_across_many_users")
        if ip_fanout > FANOUT_RISK_THRESHOLD:
            reason_codes.append("ip_shared_across_many_users")

        if is_new_device or self.model is None or u_idx is None:
            reason_codes.append("new_device") if is_new_device else None
            score = 0.55  # unknown pairing / untrained model: moderate default, refined by fan-out below
        else:
            import torch
            data = self.graph.to_hetero_data()
            self.model.eval()
            with torch.no_grad():
                embeddings = self.model(data.x_dict, data.edge_index_dict)
            link_score = self.model.link_score(embeddings, "user", u_idx, "device", d_idx)  # in [-1, 1]
            score = float(np.clip((1 - link_score) / 2, 0.0, 1.0))  # higher link_score (more typical) -> lower risk

        fanout_bonus = (0.15 if device_fanout > FANOUT_RISK_THRESHOLD else 0.0) + \
                       (0.15 if ip_fanout > FANOUT_RISK_THRESHOLD else 0.0)
        score = float(np.clip(score + fanout_bonus, 0.0, 1.0))

        reason_codes = [c for c in reason_codes if c]  # drop the None from the conditional append above
        return DetectorScore(score=round(score, 3), confidence=0.8 if self.model is not None else 0.4, reason_codes=reason_codes)

    def save(self, path: str) -> None:
        import torch, pickle
        os.makedirs(path, exist_ok=True)
        if self.model is not None:
            torch.save(self.model.state_dict(), os.path.join(path, "gnn.pt"))
        with open(os.path.join(path, "graph.pkl"), "wb") as f:
            pickle.dump(self.graph, f)

    @classmethod
    def load(cls, path: str) -> "DeviceTrustDetector":
        import torch, pickle
        from ml.device_trust.graphsage_gat import DeviceTrustGNN
        det = cls()
        with open(os.path.join(path, "graph.pkl"), "rb") as f:
            det.graph = pickle.load(f)
        gnn_path = os.path.join(path, "gnn.pt")
        if os.path.exists(gnn_path):
            det.model = DeviceTrustGNN()
            det.model.load_state_dict(torch.load(gnn_path, map_location="cpu"))
            det.model.eval()
        return det


def main():
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    events = read_all().to_dict("records")
    if not events:
        raise RuntimeError("No events in feature store — run ingestion before training.")
    print(f"Building identity graph and training device-trust GNN on {len(events)} events...")
    detector = DeviceTrustDetector().fit(events)
    detector.save(ARTIFACT_DIR)
    print(f"Saved device-trust detector artifacts to {ARTIFACT_DIR}")


if __name__ == "__main__":
    main()