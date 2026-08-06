import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter
from pydantic import BaseModel
from ingestion.event_generator import generate_event

router = APIRouter()

class AttackSimulationRequest(BaseModel):
    scenario: str  # matches frontend's { scenario } payload — was "attack_type" before, causing 422s

# In-memory queue to pass simulated events to the SSE feed
simulation_queue = asyncio.Queue()

# Fixed demo identities so repeated clicks produce comparable, explainable results on stage
DEMO_USER = "user_5"
DEMO_NEW_DEVICE = "device_999"
DEMO_NEW_IP = "192.168.77.5"
DEMO_KYC_USER = "user_71"
DEMO_ADMIN = "admin_7"


def _iso(days_ago: float = 0, hour: float | None = None) -> str:
    now = datetime.now(timezone.utc)
    if hour is not None:
        now = now.replace(hour=int(hour) % 24, minute=int((hour % 1) * 60), second=0, microsecond=0)
    return (now - timedelta(days=days_ago)).isoformat()


def _base_event(event_type: str) -> dict:
    return {
        "event_id": f"demo-{uuid.uuid4()}",
        "event_type": event_type,
        "user_id": None,
        "device_id": None,
        "ip_address": None,
        "timestamp": _iso(),
        "login_success": None,
        "txn_amount": None,
        "txn_currency": None,
        "beneficiary_id": None,
        "kyc_field_changed": None,
        "admin_action_type": None,
        "admin_role": None,
    }


def build_normal_login() -> dict:
    """Known user, known device, business hours -> should land in 'allow'."""
    e = _base_event("login")
    e.update({
        "user_id": DEMO_USER,
        "device_id": "device_3",
        "ip_address": "10.0.1.100",
        "timestamp": _iso(hour=14),
        "login_success": True,
    })
    return e


def build_impossible_travel() -> dict:
    """New device + new IP + 2AM -> behavioral AND device_trust should both fire."""
    e = _base_event("login")
    e.update({
        "user_id": DEMO_USER,
        "device_id": DEMO_NEW_DEVICE,
        "ip_address": DEMO_NEW_IP,
        "timestamp": _iso(hour=2.3),
        "login_success": True,
    })
    return e


def build_kyc_fraud() -> dict:
    """Reused PAN/phone/address across accounts + rapid edit-to-txn -> kyc detector should fire.
    Mirrors docs/demo_scenarios.md Scenario 3 exactly."""
    import hashlib
    pan, phone, address = "AAAPZ1234Q", "9999999999", "456 Duplicate Rd"

    def _sha(v: str) -> str:
        return hashlib.sha256(v.encode()).hexdigest()

    e = _base_event("onboarding")
    e.update({
        "user_id": DEMO_KYC_USER,
        "device_id": "device_119",
        "ip_address": "10.0.1.1",
        "kyc_field_changed": "pan_number",
        "pan_number": pan,
        "phone_number": phone,
        "address": address,
        "hashed_pan": _sha(pan),
        "hashed_phone": _sha(phone),
        "hashed_address": _sha(address),
        "kyc_edit_count_7d": 5,
        "time_since_last_kyc_edit_hours": 1.2,
        "rapid_kyc_to_txn": True,
    })
    return e


def build_insider_threat() -> dict:
    """Large balance override, off-hours -> rule engine + cohort IF both fire.
    Using DEMO_USER to show same-session privilege misuse after step-up."""
    e = _base_event("admin_action")
    e.update({
        "user_id": DEMO_USER,
        "device_id": DEMO_NEW_DEVICE,
        "ip_address": DEMO_NEW_IP,
        "timestamp": _iso(hour=2.5),
        "txn_amount": 75000,
        "admin_action_type": "balance_override",
        "admin_role": "support",
    })
    return e

def build_ratnesh_allow() -> dict:
    e = _base_event("login")
    e.update({"user_id": "ratnesh_anand", "ip_address": "103.15.22.1", "demo_scenario": "ratnesh_allow"}) # India IP
    return e

def build_ratnesh_block() -> dict:
    e = _base_event("login")
    e.update({"user_id": "ratnesh_anand", "ip_address": "198.51.100.5", "demo_scenario": "ratnesh_block"}) # VPN IP
    return e

def build_frequent_allow() -> dict:
    e = _base_event("login")
    e.update({"user_id": "frequent_user", "ip_address": "10.0.1.5", "demo_scenario": "frequent_allow"})
    return e

def build_frequent_block() -> dict:
    e = _base_event("login")
    e.update({"user_id": "frequent_user", "ip_address": "10.0.1.5", "demo_scenario": "frequent_block"})
    return e

def build_fraud_ring() -> dict:
    e = _base_event("login")
    e.update({"user_id": "fraud_ring_user", "ip_address": "185.15.5.5", "demo_scenario": "fraud_ring"})
    return e


SCENARIOS = {
    "normal": build_normal_login,
    "impossible_travel": build_impossible_travel,
    "kyc_fraud": build_kyc_fraud,
    "insider_threat": build_insider_threat,
    "ratnesh_allow": build_ratnesh_allow,
    "ratnesh_block": build_ratnesh_block,
    "frequent_allow": build_frequent_allow,
    "frequent_block": build_frequent_block,
    "fraud_ring": build_fraud_ring,
}


@router.post("/simulate")
async def simulate_attack(request: AttackSimulationRequest):
    builder = SCENARIOS.get(request.scenario)
    if builder is None:
        # Unknown scenario name: don't silently no-op, inject an unmodified
        # random event so it's still visible in the feed for debugging.
        event = generate_event()
    else:
        event = builder()

    await simulation_queue.put(event)
    return {"status": "Attack simulation injected successfully", "type": request.scenario}


@router.post("/reset")
async def reset_demo():
    import glob, os
    from backend.privacy.audit_log import AUDIT_LOG_DIR
    for f in glob.glob(os.path.join(AUDIT_LOG_DIR, "audit_*.jsonl")):
        open(f, "w").close()
    await simulation_queue.put({"type": "reset"})
    return {"status": "reset successful"}