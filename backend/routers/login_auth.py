"""
Risk-based login endpoint.

Flow for POST /auth/login:
  1. Verify credentials (hook to your real user store — stubbed here).
  2. Build a "login" event in the same shape as ingestion/schemas/event_schema.json.
  3. Score it with behavioral + device_trust + login_trust (NOT kyc/insider_misuse
     — those are transaction/admin-action detectors).
  4. build_login_decision() fuses the three sub-scores and returns
     allow / step_up / block, plus ranked human-readable reason codes.
  5. Write a PII-safe audit entry (same pattern as routers/score.py).
  6. Update all three detectors' online state (UserBehaviorHistory,
     device graph, login_trust's ja3/geo/velocity stores) so the NEXT
     attempt is scored against history that includes this one.

Decision -> HTTP mapping:
  allow   -> 200, session issued
  step_up -> 200, decision="step_up" (frontend redirects to /stepup,
             which already exists — this endpoint doesn't duplicate that flow)
  block   -> 403, decision="block" + reason_codes (the "explanation why")

Credential failures are handled separately from risk scoring: a wrong
password returns 401 immediately, but is still recorded into the
login-frequency tracker (failed attempts are exactly what brute-force
detection needs to see) via a lightweight event, without running the
full (and here, unnecessary) three-detector score.
"""

from __future__ import annotations
import os
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from ml.interfaces.model_schema import DetectorScore
from ml.interfaces.mock_detectors import mock_behavioral_score, mock_device_trust_score, mock_login_trust_score
from ml.login_trust.login_trust_detector import LoginTrustDetector
from backend.orchestrator.decision_engine import build_login_decision
from backend.privacy.hashing import hash_pii
from backend.privacy.audit_log import write_audit_entry

log = logging.getLogger(__name__)
router = APIRouter()

_ML_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "ml")
_LOGIN_TRUST_ARTIFACTS = os.path.join(_ML_ROOT, "login_trust", "artifacts")

# ── shared, process-lifetime detector instances ─────────────────────────────
# login_trust keeps online state (ja3/geo/velocity history) across requests,
# so — unlike the stateless mock detectors — it must be a singleton, not
# rebuilt per-request. Same lazy-load-artifacts-else-fresh pattern as
# routers/score.py uses for the other detectors.
def _load_login_trust() -> LoginTrustDetector:
    if os.path.isdir(_LOGIN_TRUST_ARTIFACTS) and os.listdir(_LOGIN_TRUST_ARTIFACTS):
        try:
            det = LoginTrustDetector.load(_LOGIN_TRUST_ARTIFACTS)
            log.info("[login_auth] Loaded LoginTrustDetector state from %s", _LOGIN_TRUST_ARTIFACTS)
            return det
        except Exception as e:
            log.warning("[login_auth] Could not load LoginTrustDetector state (%s) — starting fresh", e)
    return LoginTrustDetector()


_login_trust_det = _load_login_trust()


def _verify_credentials(user_id: str, password: str) -> bool:
    """
    STUB — replace with your real credential check (hashed password
    comparison against your user store / IdP). Kept separate from risk
    scoring on purpose: authentication ("is this the right password") and
    authorization-by-risk ("should we trust this login context") are
    different questions, and mixing them makes both harder to reason about
    and to test.
    """
    raise NotImplementedError("Wire _verify_credentials() to your real user/auth store.")


# ── request/response models ─────────────────────────────────────────────────

class LoginRequest(BaseModel):
    user_id: str
    password: str
    device_id: str | None = None
    # ja3_fingerprint is intentionally NOT taken from the request body —
    # it must come from a header set by your TLS-terminating proxy/LB
    # (see infra/ja3_proxy.py and the integration doc), never from the
    # client directly, since a client can trivially lie about its own JA3.


class LoginDecisionResponse(BaseModel):
    decision: str  # "allow" | "step_up" | "block"
    fused_score: float
    reason_codes: list[str]
    session_token: str | None = None
    challenge_hint: str | None = None  # e.g. "otp" — for the frontend to pre-select a step-up method


# ── endpoint ─────────────────────────────────────────────────────────────────

@router.post("/auth/login", response_model=LoginDecisionResponse)
def login(req: LoginRequest, request: Request):
    now = datetime.now(timezone.utc)
    ip_address = request.client.host if request.client else None
    ja3 = request.headers.get("x-ja3-fingerprint")  # injected by the TLS proxy — see infra/ja3_proxy.py

    # ── 1. credential check ────────────────────────────────────────────────
    try:
        credentials_ok = _verify_credentials(req.user_id, req.password)
    except NotImplementedError:
        raise HTTPException(status_code=501, detail="Credential store not wired up yet")

    login_event = {
        "event_id": f"login_{req.user_id}_{int(now.timestamp() * 1000)}",
        "event_type": "login",
        "user_id": req.user_id,
        "device_id": req.device_id,
        "ip_address": ip_address,
        "ja3_fingerprint": ja3,
        "timestamp": now.isoformat(),
        "login_success": credentials_ok,
    }

    if not credentials_ok:
        # Still feed the attempt into velocity tracking (brute-force needs
        # to see failed attempts), but skip the full 3-detector score —
        # wrong credentials are a hard 401 regardless of risk context.
        _login_trust_det.observe_attempt(login_event)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # ── 2. risk scoring (behavioral + device_trust + login_trust) ─────────
    # NOTE: swap these two mocks for the real BehavioralDetector /
    # DeviceTrustDetector the same way routers/score.py does (artifact
    # lazy-load with mock fallback) once this endpoint is wired into the
    # shared detector-loading code — kept as direct mock calls here to
    # keep this file focused on the login-specific integration.
    sub_scores: dict[str, DetectorScore] = {
        "behavioral": mock_behavioral_score(login_event),
        "device_trust": mock_device_trust_score(login_event),
        "login_trust": _login_trust_det.score_event(login_event),
    }

    result = build_login_decision(sub_scores)

    # ── 3. update online state for next time (causal — AFTER scoring) ─────
    _login_trust_det.observe_attempt(login_event)

    # ── 4. audit log (PII-safe) ────────────────────────────────────────────
    user_id_hash = hash_pii(req.user_id)
    write_audit_entry(
        event_id=login_event["event_id"],
        user_id_hash=user_id_hash,
        decision=result.decision,
        sub_scores=result.sub_scores,
        fused_score=result.fused_score,
        reason_codes=result.reason_codes,
    )

    # ── 5. respond per decision ─────────────────────────────────────────────
    if result.decision == "block":
        # 403 (not 200) — the person is denied the login outright, with the
        # ranked, human-readable reason codes as the "explanation why".
        raise HTTPException(
            status_code=403,
            detail={
                "decision": "block",
                "fused_score": result.fused_score,
                "reason_codes": result.reason_codes,
            },
        )

    if result.decision == "step_up":
        return LoginDecisionResponse(
            decision="step_up",
            fused_score=result.fused_score,
            reason_codes=result.reason_codes,
            challenge_hint="otp",
        )

    # allow
    session_token = f"session_{hash_pii(req.user_id)[:16]}_{int(now.timestamp())}"  # stub — issue a real JWT/session in prod
    return LoginDecisionResponse(
        decision="allow",
        fused_score=result.fused_score,
        reason_codes=result.reason_codes,
        session_token=session_token,
    )
