"""
JA3 fingerprint trust signal.

JA3 is a hash of the TLS ClientHello (version, cipher suites, extensions,
elliptic curves, ec_point_formats) — it fingerprints the *TLS client
stack* (browser + OS + TLS library), not the human. It's captured at the
TLS layer, upstream of FastAPI (see infra/ja3_proxy.py or the nginx note
in the integration doc) and arrives here as a plain string header.

This is a rule/stat-based detector, not a learned model — deliberately,
same reasoning as insider_misuse/rules.py: fanout and blocklist checks
are cheap, deterministic, and don't need training data to be trustworthy
on day one. A learned component (e.g. rarity via a Bayesian count) can be
layered on top later without changing the interface.
"""

from __future__ import annotations
from collections import defaultdict

# A starter blocklist of JA3 hashes for common non-browser HTTP/TLS clients
# and known automation/attack tooling. This is illustrative — replace with
# a maintained feed (e.g. Abuse.ch JA3 blocklist) in production, and treat
# it as one signal, not a hard block on its own (some legitimate mobile
# SDKs also produce "unusual" JA3s).
KNOWN_AUTOMATION_JA3 = {
    "e7d705a3286e19ea42f587b344ee6865",  # python-requests (illustrative)
    "6734f37431670b3ab4292b8f60f29984",  # curl (illustrative)
    "b32309a26951912be7dba376398abc3b",  # generic headless/bot TLS stack (illustrative)
}

FANOUT_RISK_THRESHOLD = 8  # a JA3 seen across more than this many distinct users is suspicious


class JA3TrustStore:
    """
    Per-user known-JA3 history, plus a global JA3 -> set(user_id) index for
    fanout detection (many distinct accounts logging in with the exact same
    TLS client fingerprint is a device-farm / credential-stuffing signature).

    In-memory here for parity with UserBehaviorHistory (ml/behavioral) —
    back this with Redis in production; the JA3 comparison logic below is
    what's frozen, not the storage backend.
    """

    def __init__(self):
        self._known_ja3_by_user: dict[str, set[str]] = defaultdict(set)
        self._users_by_ja3: dict[str, set[str]] = defaultdict(set)

    def observe(self, user_id: str, ja3: str | None) -> None:
        if not ja3:
            return
        self._known_ja3_by_user[user_id].add(ja3)
        self._users_by_ja3[ja3].add(user_id)

    def is_new_for_user(self, user_id: str, ja3: str | None) -> bool:
        if not ja3:
            return True
        return ja3 not in self._known_ja3_by_user[user_id]

    def fanout(self, ja3: str | None) -> int:
        if not ja3:
            return 0
        return len(self._users_by_ja3[ja3])


def score_ja3(user_id: str, ja3: str | None, store: JA3TrustStore) -> tuple[float, list[str]]:
    """Returns (risk_contribution in [0,1], reason_codes)."""
    if not ja3:
        # No JA3 available (e.g. proxy not deployed yet, or plain HTTP in dev)
        # -> neutral, not risky by default, but callers should treat this as
        # low-confidence for the overall login_trust score.
        return 0.0, []

    reasons: list[str] = []
    risk = 0.0

    if ja3 in KNOWN_AUTOMATION_JA3:
        risk += 0.6
        reasons.append("known_automation_tooling")

    if store.is_new_for_user(user_id, ja3):
        risk += 0.15
        reasons.append("new_ja3_fingerprint")

    fanout = store.fanout(ja3)
    if fanout > FANOUT_RISK_THRESHOLD:
        risk += 0.25
        reasons.append("ja3_shared_across_many_users")

    return min(risk, 1.0), reasons
