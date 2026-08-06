"""
Exposes the real user-device-IP identity graph (ml/device_trust/graph_builder.py)
over HTTP so the frontend's 3D graph reflects actual feature-store events
instead of synthetic ones.

Trade-off, stated plainly: this rebuilds the graph from scratch on every
call (O(events)), capped to the most recent N events for responsiveness.
Fine for a demo's event volume; a production version would maintain the
graph incrementally rather than reconstruct it per request.
"""

from __future__ import annotations
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException

from feature_store.store import read_all

router = APIRouter()

_MAX_EVENTS_FOR_GRAPH = 2000
_FANOUT_THRESHOLD = 8  # matches ml/device_trust/train.py FANOUT_RISK_THRESHOLD


@router.get("/graph/identity")
def get_identity_graph():
    try:
        from ml.device_trust.graph_builder import IdentityGraph
    except ImportError as e:
        # graph_builder.py imports torch/torch_geometric unconditionally —
        # surface that clearly instead of a bare 500
        raise HTTPException(
            status_code=503,
            detail=f"Identity graph requires torch + torch_geometric (pip install torch torch_geometric --break-system-packages): {e}",
        )

    df = read_all()
    if df.empty:
        return {
            "nodes": [], "edges": [], "fanout_threshold": _FANOUT_THRESHOLD,
            "event_count": 0, "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    events = df.tail(_MAX_EVENTS_FOR_GRAPH).to_dict("records")
    graph = IdentityGraph().build_from_events(events)
    payload = graph.export_graph(fanout_threshold=_FANOUT_THRESHOLD)
    payload["event_count"] = len(events)
    payload["generated_at"] = datetime.now(timezone.utc).isoformat()
    return payload