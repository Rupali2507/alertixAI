"""
GraphSAGE + GAT device-trust model.

Architecture: one heterogeneous GraphSAGE layer to aggregate structural
neighborhood signal (good at "how well-connected/typical is this node"),
followed by a heterogeneous GAT layer that lets the model learn WHICH
neighbor relations matter most for a given node — a device shared with 30
unrelated users should be down-weighted relative to one used consistently
by a single user, and attention gives the model that flexibility where
plain GraphSAGE mean-aggregation would treat every neighbor equally.

Because there's no labeled account-takeover data, this is trained with a
self-supervised link-prediction objective (see train.py): learn to
distinguish real (user, device) edges from random non-edges. At inference,
the model's confidence that a given (user, device) pairing is "plausible"
given the rest of the graph becomes the trust signal — a pairing the model
can't confidently justify from graph structure is treated as higher risk.
"""

from __future__ import annotations

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    from torch_geometric.nn import SAGEConv, GATConv, HeteroConv
except ImportError as e:  # pragma: no cover
    raise ImportError(
        "torch and torch_geometric are required for ml/device_trust. "
        "Install with: pip install torch torch_geometric --break-system-packages"
    ) from e


NODE_TYPES = ("user", "device", "ip")
BASE_RELATIONS = (
    ("user", "uses", "device"), ("device", "rev_uses", "user"),
    ("user", "connects_from", "ip"), ("ip", "rev_connects_from", "user"),
    ("device", "seen_on", "ip"), ("ip", "rev_seen_on", "device"),
)


class DeviceTrustGNN(nn.Module):
    """
    Two-hop heterogeneous encoder: HeteroConv(GraphSAGE) -> HeteroConv(GAT)
    -> per-node-type embedding. A link-prediction head scores (user, device)
    pairs via dot product on the final embeddings.
    """

    def __init__(self, hidden_dim: int = 32, out_dim: int = 16, heads: int = 4):
        super().__init__()
        self.sage = HeteroConv(
            {rel: SAGEConv((-1, -1), hidden_dim) for rel in BASE_RELATIONS}, aggr="mean"
        )
        self.gat = HeteroConv(
            {rel: GATConv((-1, -1), out_dim, heads=heads, concat=False, add_self_loops=False) for rel in BASE_RELATIONS},
            aggr="mean",
        )

    def forward(self, x_dict, edge_index_dict):
        h_dict = self.sage(x_dict, edge_index_dict)
        h_dict = {k: F.elu(v) for k, v in h_dict.items()}
        out_dict = self.gat(h_dict, edge_index_dict)
        return {k: F.normalize(v, dim=-1) for k, v in out_dict.items()}

    def link_logit(self, embeddings: dict, src_type: str, src_idx: int, dst_type: str, dst_idx: int):
        """
        Raw (still-attached-to-the-graph) similarity logit between two node
        embeddings — used during training so gradients flow through the loss.
        """
        u = embeddings[src_type][src_idx]
        v = embeddings[dst_type][dst_idx]
        return (u * v).sum()

    def link_score(self, embeddings: dict, src_type: str, src_idx: int, dst_type: str, dst_idx: int) -> float:
        """Detached float version of link_logit, for inference / reporting."""
        return float(self.link_logit(embeddings, src_type, src_idx, dst_type, dst_idx))