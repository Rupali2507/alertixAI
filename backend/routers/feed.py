"""
FastAPI SSE router for the live event feed.
Streams synthetic events scored by the real decision engine.
"""

import asyncio
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from ingestion.event_generator import generate_event
from backend.routers.score import (
    _score_behavioral,
    _score_device_trust,
    _score_kyc,
    _score_insider,
)
from backend.orchestrator.decision_engine import build_decision
from backend.privacy.hashing import hash_pii

router = APIRouter()

async def live_event_generator():
    """Generates synthetic events, scores them, and yields them as SSE."""
    index = 0
    while True:
        # Emit an event every 2-4 seconds to simulate traffic
        await asyncio.sleep(2.0)
        
        raw_event = generate_event()
        
        sub_scores = {
            "behavioral":    _score_behavioral(raw_event),
            "device_trust":  _score_device_trust(raw_event),
            "kyc":           _score_kyc(raw_event),
            "insider_misuse": _score_insider(raw_event),
        }
        result = build_decision(sub_scores)
        
        # Build payload shaped like the frontend's HighRiskEvent + CaseDetail info
        user_hash = hash_pii(str(raw_event.get("user_id", "")))
        short_hmac = user_hash[:8] + "..." + user_hash[-4:]
        
        # Sub-scores for signal fusion bars
        signal_fusion = [
            round(sub_scores["behavioral"].score, 2),
            round(sub_scores["device_trust"].score, 2),
            round(sub_scores["kyc"].score, 2)
        ]
        
        reason_label = result.reason_codes[0] if result.reason_codes else "Verified"
        
        # Convert Pydantic models to dict to avoid serialization issues
        fused_result_dict = result.dict() if hasattr(result, "dict") else result.model_dump()
        
        payload = {
            "id": raw_event.get("event_id", f"evt_{index}"),
            "hmac": short_hmac,
            "score": round(result.fused_score, 2),
            "signalFusion": signal_fusion,
            "decision": result.decision,
            "reasonLabel": reason_label,
            "timestamp": raw_event.get("timestamp"),
            "raw_event": raw_event,
            "fusedResult": fused_result_dict,
        }
        
        yield f"data: {json.dumps(payload)}\n\n"
        index += 1

@router.get("/feed")
async def get_live_feed():
    """SSE endpoint for live dashboard event stream."""
    return StreamingResponse(live_event_generator(), media_type="text/event-stream")
