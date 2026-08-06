"""
Tight-window login-frequency / brute-force signal.

ml/behavioral/feature_engineering.py already computes `logins_last_24hr`
and `failed_login_ratio_24hr` as part of the behavioral detector's daily
window — good for "is this user's overall login cadence unusual". This
module is deliberately narrower and faster: short sliding windows (per
minute) that catch brute-force / credential-stuffing bursts *before* a
24-hour window would ever flag them, tracked both per-user and per-IP
(an attacker rotating usernames from one IP is just as much a signal as
one user's account being hammered).
"""

from __future__ import annotations
from collections import defaultdict, deque
from datetime import datetime, timedelta

WINDOW = timedelta(minutes=10)
USER_ATTEMPT_THRESHOLD = 5      # >5 attempts / 10 min for one user -> risky
IP_ATTEMPT_THRESHOLD = 15       # >15 attempts / 10 min from one IP -> risky (credential stuffing)
FAILED_RATIO_THRESHOLD = 0.6    # majority-failed in the window -> risky


class LoginVelocityTracker:
    """In-memory sliding-window counters. Back with Redis (INCR + EXPIRE
    or a sorted set) in production for multi-instance deployments."""

    def __init__(self):
        self._by_user: dict[str, deque] = defaultdict(deque)  # (ts, success) tuples
        self._by_ip: dict[str, deque] = defaultdict(deque)

    def _prune(self, dq: deque, now: datetime) -> None:
        cutoff = now - WINDOW
        while dq and dq[0][0] < cutoff:
            dq.popleft()

    def observe(self, user_id: str, ip_address: str | None, ts: datetime, success: bool) -> None:
        self._by_user[user_id].append((ts, success))
        self._prune(self._by_user[user_id], ts)
        if ip_address:
            self._by_ip[ip_address].append((ts, success))
            self._prune(self._by_ip[ip_address], ts)

    def window_stats(self, user_id: str, ip_address: str | None, now: datetime) -> dict:
        self._prune(self._by_user[user_id], now)
        user_attempts = list(self._by_user[user_id])
        ip_attempts = list(self._by_ip[ip_address]) if ip_address else []
        if ip_address:
            self._prune(self._by_ip[ip_address], now)
            ip_attempts = list(self._by_ip[ip_address])

        user_failed_ratio = (
            sum(1 for _, ok in user_attempts if not ok) / len(user_attempts) if user_attempts else 0.0
        )
        return {
            "user_attempts_10min": len(user_attempts),
            "ip_attempts_10min": len(ip_attempts),
            "user_failed_ratio_10min": user_failed_ratio,
        }


def score_login_frequency(
    user_id: str, ip_address: str | None, ts: datetime, tracker: LoginVelocityTracker
) -> tuple[float, list[str]]:
    """
    Returns (risk_contribution in [0,1], reason_codes). Call this BEFORE
    `tracker.observe(...)` for the current attempt so the current attempt
    doesn't count against itself.
    """
    stats = tracker.window_stats(user_id, ip_address, ts)
    reasons: list[str] = []
    risk = 0.0

    if stats["user_attempts_10min"] > USER_ATTEMPT_THRESHOLD:
        risk += 0.45
        reasons.append("brute_force_velocity")

    if stats["ip_attempts_10min"] > IP_ATTEMPT_THRESHOLD:
        risk += 0.35
        reasons.append("credential_stuffing_ip_velocity")

    if stats["user_failed_ratio_10min"] > FAILED_RATIO_THRESHOLD and stats["user_attempts_10min"] >= 3:
        risk += 0.25
        reasons.append("high_failed_login_ratio")

    return min(risk, 1.0), reasons
