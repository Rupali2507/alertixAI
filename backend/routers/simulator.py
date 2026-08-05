import asyncio
from fastapi import APIRouter
from pydantic import BaseModel
from ingestion.event_generator import generate_event

router = APIRouter()

class AttackSimulationRequest(BaseModel):
    attack_type: str

# In-memory queue to pass simulated events to the SSE feed
simulation_queue = asyncio.Queue()

@router.post("/simulate")
async def simulate_attack(request: AttackSimulationRequest):
    # Generate a base event
    event = generate_event()
    
    # Mutate the event based on the attack type to trigger real ML detection
    if request.attack_type == "impossible_travel":
        # Simulate impossible travel: Same user, suddenly in a high-risk country, high velocity
        event["ip_address"] = "194.26.29.1" # Example high risk IP
        event["user_agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        event["transaction_amount"] = 9500.0
        event["typing_cadence_score"] = 0.1 # Totally different typing cadence
        
    elif request.attack_type == "bot_swarm":
        # Simulate bot swarm: High velocity, perfectly uniform typing, weird device
        event["typing_cadence_score"] = 0.99
        event["mouse_movement_entropy"] = 0.05
        event["device_id"] = "unknown_device_999"
        event["is_vpn"] = True
        
    elif request.attack_type == "insider_threat":
        # Simulate insider: Known user, but accessing extremely restricted DBs off-hours
        event["access_level_required"] = 5
        event["user_clearance"] = 2
        event["time_of_day"] = "03:00"
        
    elif request.attack_type == "safe_login":
        # Simulate perfectly safe login
        event["transaction_amount"] = 12.50
        event["is_vpn"] = False
        event["typing_cadence_score"] = 0.8
        event["mouse_movement_entropy"] = 0.7
        event["ip_address"] = "192.168.1.50"
        
    # Push to queue
    await simulation_queue.put(event)
    return {"status": "Attack simulation injected successfully", "type": request.attack_type}
