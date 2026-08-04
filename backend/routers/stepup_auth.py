from fastapi import APIRouter
from pydantic import BaseModel
import random

router = APIRouter()

class StepUpRequest(BaseModel):
    user_id: str
    method: str = "otp"  # "otp" | "biometric" | "liveness"

class StepUpResponse(BaseModel):
    challenge_id: str
    method: str
    status: str  # "pending"

class StepUpVerifyRequest(BaseModel):
    challenge_id: str
    code: str

@router.post("/stepup/initiate", response_model=StepUpResponse)
def initiate_stepup(req: StepUpRequest):
    challenge_id = f"chal_{random.randint(100000, 999999)}"
    return StepUpResponse(challenge_id=challenge_id, method=req.method, status="pending")

@router.post("/stepup/verify")
def verify_stepup(req: StepUpVerifyRequest):
    # mock: any 6-digit code beginning with "1" succeeds, for demo predictability
    success = req.code.startswith("1") and len(req.code) == 6
    return {"challenge_id": req.challenge_id, "verified": success}