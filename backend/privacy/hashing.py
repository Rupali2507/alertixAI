import hmac
import hashlib
import os

# In production this comes from a secrets manager / env var, never hardcoded.
# For the demo, we generate one at import time and keep it consistent for the process lifetime.
_SALT = os.environ.get("PII_HASH_SALT", "alertixai-demo-salt-change-in-prod").encode("utf-8")

def hash_pii(value: str) -> str:
    """
    Salted HMAC-SHA256 hash of a PII value (e.g. user_id, ip_address, device_id).
    Deterministic for a given salt, so the same raw value always hashes the same way —
    this preserves joinability across events without exposing the raw value.
    """
    if value is None:
        return None
    return hmac.new(_SALT, value.encode("utf-8"), hashlib.sha256).hexdigest()

def hash_event_pii(event: dict, fields: list[str] = None) -> dict:
    """
    Returns a copy of the event with specified PII fields hashed.
    Default fields: user_id, device_id, ip_address, beneficiary_id.
    """
    if fields is None:
        fields = ["user_id", "device_id", "ip_address", "beneficiary_id"]

    hashed_event = event.copy()
    for field in fields:
        if field in hashed_event and hashed_event[field] is not None:
            hashed_event[field] = hash_pii(hashed_event[field])
    return hashed_event