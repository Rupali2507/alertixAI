from fastapi import APIRouter
from backend.privacy.audit_log import read_audit_log

router = APIRouter()

@router.get("/audit")
def get_audit_log():
    """Returns the privacy-compliant audit log for today."""
    logs = read_audit_log()
    # Reverse to show newest first
    return {"logs": logs[::-1]}
