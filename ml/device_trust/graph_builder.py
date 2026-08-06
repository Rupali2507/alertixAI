"""
Builds the user-device-IP heterogeneous graph that GraphSAGE/GAT
(graphsage_gat.py) trains on for device-trust scoring.

Graph schema:
  Node types : user, device, ip
  Edge types : (user, uses, device), (user, connects_from, ip),
               (device, seen_on, ip)   [+ reverse edges of each, added
               automatically for bidirectional message passing]
  Edge weight: co-occurrence count within the observed event window — a
               proxy for relationship strength/stability. A device a user
               has used 400 times is structurally very different from one
               used once, even before any model sees behavior.

Design rationale: fraud rings and account-takeover often show up as GRAPH
anomalies before they show up as behavioral anomalies — e.g. one device
fanning out across many otherwise-unrelated user accounts, or an IP shared
by devices that have never co-occurred with each other's users. That's
exactly the kind of relational signal a GNN can pick up that a per-event
tabular model (the behavioral detector) structurally cannot, which is why
device trust is its own detector rather than more columns on the
behavioral one.
"""

from __future__ import annotations
from collections import defaultdict

import numpy as np

try:
    import torch
    from torch_geometric.data import HeteroData
except ImportError as e:  # pragma: no cover
    raise ImportError(
        "torch and torch_geometric are required for ml/device_trust. "
        "Install with: pip install torch torch_geometric --break-system-packages"
    ) from e


class IdentityGraph:
    """Assigns stable integer node indices per node type and accumulates edge weights."""

    def __init__(self):
        self._node_index: dict[str, dict[str, int]] = {"user": {}, "device": {}, "ip": {}}
        self._edges: dict[tuple[str, str, str], dict[tuple[int, int], int]] = {}

    def _get_or_add(self, node_type: str, key: str) -> int:
        table = self._node_index[node_type]
        if key not in table:
            table[key] = len(table)
        return table[key]

    def _add_edge(self, edge_type: tuple[str, str, str], src: int, dst: int):
        if edge_type not in self._edges:
            self._edges[edge_type] = {}
        if (src, dst) not in self._edges[edge_type]:
            self._edges[edge_type][(src, dst)] = 0
        self._edges[edge_type][(src, dst)] += 1

    def add_event(self, event: dict) -> None:
        user_id, device_id, ip = event.get("user_id"), event.get("device_id"), event.get("ip_address")
        if user_id and device_id:
            u, d = self._get_or_add("user", user_id), self._get_or_add("device", device_id)
            self._add_edge(("user", "uses", "device"), u, d)
        if user_id and ip:
            u, i = self._get_or_add("user", user_id), self._get_or_add("ip", ip)
            self._add_edge(("user", "connects_from", "ip"), u, i)
        if device_id and ip:
            d, i = self._get_or_add("device", device_id), self._get_or_add("ip", ip)
            self._add_edge(("device", "seen_on", "ip"), d, i)

    def node_id(self, node_type: str, key: str) -> int | None:
        return self._node_index[node_type].get(key)

    def num_nodes(self, node_type: str) -> int:
        return len(self._node_index[node_type])

    def degree(self, node_type: str, key: str) -> int:
        """Raw degree — used both as a GNN input feature and as a cheap fallback trust signal."""
        idx = self.node_id(node_type, key)
        if idx is None:
            return 0
        deg = 0
        for (t1, _, t2), edges in self._edges.items():
            if t1 == node_type:
                deg += sum(1 for (a, b) in edges if a == idx)
            if t2 == node_type:
                deg += sum(1 for (a, b) in edges if b == idx)
        return deg

    def to_hetero_data(self) -> "HeteroData":
        data = HeteroData()

        for node_type in ("user", "device", "ip"):
            n = max(self.num_nodes(node_type), 1)
            # node feature = [log1p(degree)] for now — graphsage_gat.py projects
            # this 1-dim input up via lazy (-1,-1) SAGEConv/GATConv, so richer
            # per-node features can be added later without changing the model's
            # input contract.
            degrees = np.zeros(n, dtype=np.float32)
            for key, idx in self._node_index[node_type].items():
                degrees[idx] = self.degree(node_type, key)
            data[node_type].x = torch.tensor(np.log1p(degrees).reshape(-1, 1), dtype=torch.float32)

        for (src_type, rel, dst_type), edges in self._edges.items():
            if not edges:
                continue
            src = [a for (a, b) in edges]
            dst = [b for (a, b) in edges]
            weight = [w for w in edges.values()]
            data[(src_type, rel, dst_type)].edge_index = torch.tensor([src, dst], dtype=torch.long)
            data[(src_type, rel, dst_type)].edge_weight = torch.tensor(weight, dtype=torch.float32)
            # reverse edges so message passing is bidirectional — standard
            # practice for heterogeneous GNNs unless a relation is inherently directed
            data[(dst_type, f"rev_{rel}", src_type)].edge_index = torch.tensor([dst, src], dtype=torch.long)
            data[(dst_type, f"rev_{rel}", src_type)].edge_weight = torch.tensor(weight, dtype=torch.float32)

        return data

    def build_from_events(self, events: list[dict]) -> "IdentityGraph":
        for e in events:
            self.add_event(e)
        return self

    def export_graph(self, fanout_threshold: int = 8) -> dict:
        """
        Serializes the graph for display — the same structural signal
        (degree / fan-out) that DeviceTrustDetector's guardrail bonus uses
        in train.py, just exposed as data instead of only a risk delta.
        """
        reverse_index = {
            node_type: {idx: key for key, idx in table.items()}
            for node_type, table in self._node_index.items()
        }

        nodes = []
        for node_type, table in self._node_index.items():
            for key, idx in table.items():
                deg = self.degree(node_type, key)
                nodes.append({
                    "id": f"{node_type}:{key}",
                    "type": node_type,
                    "label": key,
                    "degree": deg,
                    # mirrors FANOUT_RISK_THRESHOLD's meaning in train.py — a
                    # device/IP touching an implausible number of otherwise-
                    # unrelated users/devices is the device-farm signature
                    "suspicious": node_type in ("device", "ip") and deg > fanout_threshold,
                })

        edges = []
        for (src_type, rel, dst_type), edge_map in self._edges.items():
            for (src_idx, dst_idx), weight in edge_map.items():
                src_key = reverse_index[src_type].get(src_idx)
                dst_key = reverse_index[dst_type].get(dst_idx)
                if src_key is None or dst_key is None:
                    continue
                edges.append({
                    "source": f"{src_type}:{src_key}",
                    "target": f"{dst_type}:{dst_key}",
                    "weight": weight,   # co-occurrence count — same signal graphsage_gat.py trains on
                    "relation": rel,
                })

        return {"nodes": nodes, "edges": edges, "fanout_threshold": fanout_threshold}