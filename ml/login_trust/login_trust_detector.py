"""
LoginTrustDetector — the fourth sub-score for login events, alongside
`behavioral` and `device_trust` (kyc / insider_misuse don't apply to a
plain login). Combines:

  - JA3 TLS fingerprint trust   (ja3_trust.py)
  - IP geolocation velocity     (geo_velocity.py)   — impossible travel
  - login attempt frequency     (login_frequency.py) — brute force / stuffing

into one DetectorScore, following the exact BaseDetector interface used
by behavioral/device_trust/kyc/insider_misuse (see ml/interfaces/detector_base.py)
so it plugs into the existing fusion + decision_engine + reason_codes
pipeline with zero changes to that pipeline's shape.

Deliberately rule/stat-based (not a trained model): every sub-signal here
is individually explainable, which is what the "deny with explanation"
requirement needs — a black-box score can't tell a user *why* they were
blocked. This mirrors the project's existing mixed approach (insider_misuse
is also rule-based; device_trust adds explicit fanout guardrails on top of
its GNN for the same reason: explainability > marginal accuracy for
security-relevant thresholds).
"""

from __future__ import annotations
from datetime import datetime

from ml.interfaces.detector_base import BaseDetector
from ml.interfaces.model_schema import DetectorScore
from ml.login_trust.ja3_trust import JA3TrustStore, score_ja3
from ml.login_trust.geo_velocity import LoginLocationHistory, score_geo_velocity, resolve_ip
from ml.login_trust.login_frequency import LoginVelocityTracker, score_login_frequency

# Sub-signal weights within login_trust's own [0,1] score. These are
# independent of the top-level fusion weights in orchestrator/config.py —
# this is "how much does geo-velocity matter *within* login_trust",
# not "how much does login_trust matter overall".
_WEIGHTS = {"ja3": 0.30, "geo": 0.40, "frequency": 0.30}


class LoginTrustDetector(BaseDetector):
    name = "login_trust"

    def __init__(self):
        self.ja3_store = JA3TrustStore()
        self.geo_history = LoginLocationHistory()
        self.velocity_tracker = LoginVelocityTracker()

    # No statistical parameters to fit — state is built up online via
    # observe(), same pattern as behavioral's UserBehaviorHistory. fit()
    # exists to satisfy BaseDetector and to allow warm-starting from
    # historical login events (e.g. replaying last 30 days at deploy time
    # so day-one users aren't all treated as "first login ever").
    def fit(self, events: list[dict]) -> "LoginTrustDetector":
        for event in sorted(events, key=lambda e: e["timestamp"]):
            if event.get("event_type") != "login":
                continue
            self._observe_event(event)
        return self

    def score_event(self, event: dict, context: dict | None = None) -> DetectorScore:
        user_id = event.get("user_id")
        ip_address = event.get("ip_address")
        ja3 = event.get("ja3_fingerprint")
        ts = datetime.fromisoformat(event["timestamp"])
        login_success = event.get("login_success")  # None until credential check has run

        ja3_risk, ja3_reasons = score_ja3(user_id, ja3, self.ja3_store)
        geo_risk, geo_reasons, _point = score_geo_velocity(
            user_id, ip_address, ts, self.geo_history, geo_lookup=self._geo_lookup
        )
        # frequency check reads state as of *before* this attempt — caller
        # is responsible for calling `observe_attempt(...)` separately once
        # the credential-check outcome (login_success) is known.
        freq_risk, freq_reasons = score_login_frequency(user_id, ip_address, ts, self.velocity_tracker)

        score = (
            _WEIGHTS["ja3"] * ja3_risk
            + _WEIGHTS["geo"] * geo_risk
            + _WEIGHTS["frequency"] * freq_risk
        )

        # Confidence reflects how much of the signal stack we actually had —
        # a login with no JA3 (proxy not deployed) and no geo-resolvable IP
        # is scored, but the fusion layer should down-weight it accordingly,
        # same treatment device_trust gives a brand-new device.
        confidence = 1.0
        if not ja3:
            confidence -= 0.3
        if not ip_address:
            confidence -= 0.3
        confidence = max(confidence, 0.3)

        reasons = ja3_reasons + geo_reasons + freq_reasons
        return DetectorScore(
            score=round(min(score, 1.0), 3),
            confidence=round(confidence, 2),
            reason_codes=reasons,
        )

    def observe_attempt(self, event: dict) -> None:
        """
        Call AFTER the credential check and AFTER score_event(), once
        `login_success` is known — updates all three sub-signal stores so
        the NEXT attempt is scored against a history that includes this one.
        Causal ordering matches ml/behavioral's history.observe() pattern.
        """
        self._observe_event(event)

    def _observe_event(self, event: dict) -> None:
        user_id = event.get("user_id")
        ts = datetime.fromisoformat(event["timestamp"])
        ip_address = event.get("ip_address")

        self.ja3_store.observe(user_id, event.get("ja3_fingerprint"))
        self.velocity_tracker.observe(
            user_id, ip_address, ts, success=bool(event.get("login_success"))
        )
        if ip_address:
            point = self._geo_lookup(ip_address)
            if point is not None:
                self.geo_history.observe(user_id, point, ts)

    def _geo_lookup(self, ip_address: str):
        try:
            return resolve_ip(ip_address)
        except NotImplementedError:
            return None  # geo provider not wired up yet — degrade gracefully, don't crash scoring

    # ── persistence ──────────────────────────────────────────────────────
    def save(self, path: str) -> None:
        import os, pickle
        os.makedirs(path, exist_ok=True)
        with open(os.path.join(path, "login_trust_state.pkl"), "wb") as f:
            pickle.dump(
                {
                    "ja3_store": self.ja3_store,
                    "geo_history": self.geo_history,
                    "velocity_tracker": self.velocity_tracker,
                },
                f,
            )

    @classmethod
    def load(cls, path: str) -> "LoginTrustDetector":
        import os, pickle
        det = cls()
        state_path = os.path.join(path, "login_trust_state.pkl")
        if os.path.exists(state_path):
            with open(state_path, "rb") as f:
                state = pickle.load(f)
            det.ja3_store = state["ja3_store"]
            det.geo_history = state["geo_history"]
            det.velocity_tracker = state["velocity_tracker"]
        return det
