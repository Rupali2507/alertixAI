"""
Feature engineering for the behavioral/session-anomaly detector.

Turns a raw event stream (see ingestion/schemas/event_schema.json) into a
fixed-width numeric feature vector per (user_id, event) pair. Features are
computed from a rolling window of that user's PRIOR events, so they capture
velocity and deviation-from-self rather than absolute values — this is
what lets the same model generalize across users with very different
baseline behavior (a power user making 40 txns/day isn't anomalous at 40;
a dormant user suddenly making 40 is).

Design notes:
- All features are causal: only events strictly before `event["timestamp"]`
  are used, so this is safe to run online (streaming) as well as in batch
  training — train/serve skew is minimized by construction.
- Cyclical time encoding (sin/cos of hour-of-day, day-of-week) avoids the
  discontinuity of raw hour-of-day (23:00 and 00:00 are numerically far
  apart but behaviorally adjacent).
- Feature order is fixed by FEATURE_NAMES and must not change without a
  version bump — the autoencoder and isolation forest are both trained on
  this exact ordering.
"""

from __future__ import annotations
import math
from collections import defaultdict
from datetime import datetime, timedelta

import numpy as np

FEATURE_NAMES = [
    "hour_sin", "hour_cos", "dow_sin", "dow_cos",
    "seconds_since_last_event",
    "events_last_5min", "events_last_1hr", "events_last_24hr",
    "logins_last_24hr", "failed_login_ratio_24hr",
    "txn_count_last_1hr", "txn_amount_sum_last_1hr", "txn_amount_zscore",
    "distinct_devices_last_24hr", "distinct_ips_last_24hr",
    "distinct_beneficiaries_last_24hr",
    "is_new_device", "is_new_ip",
    "account_age_days_bucket",
]
N_FEATURES = len(FEATURE_NAMES)


class UserBehaviorHistory:
    """
    Rolling per-user event history used to derive velocity/deviation features.
    Kept in-memory here for simplicity — production would back this with an
    online feature store (Redis) keyed by user_id, but the FEATURE
    DEFINITIONS below are what's frozen, not the storage backend.
    """

    def __init__(self, max_window: timedelta = timedelta(days=30)):
        self.max_window = max_window
        self._events: dict[str, list[dict]] = defaultdict(list)
        self._known_devices: dict[str, set[str]] = defaultdict(set)
        self._known_ips: dict[str, set[str]] = defaultdict(set)
        self._txn_amount_stats: dict[str, tuple[float, float, int]] = {}  # (mean, M2, n) — Welford's algorithm

    def observe(self, event: dict) -> None:
        """Register an event into history AFTER it's been scored — call order matters for causality."""
        user_id = event["user_id"]
        self._events[user_id].append(event)
        cutoff = datetime.fromisoformat(event["timestamp"]) - self.max_window
        self._events[user_id] = [
            e for e in self._events[user_id] if datetime.fromisoformat(e["timestamp"]) >= cutoff
        ]
        if event.get("device_id"):
            self._known_devices[user_id].add(event["device_id"])
        if event.get("ip_address"):
            self._known_ips[user_id].add(event["ip_address"])
        if event.get("event_type") == "transaction" and event.get("txn_amount") is not None:
            self._update_txn_stats(user_id, event["txn_amount"])

    def _update_txn_stats(self, user_id: str, amount: float) -> None:
        mean, m2, n = self._txn_amount_stats.get(user_id, (0.0, 0.0, 0))
        n += 1
        delta = amount - mean
        mean += delta / n
        m2 += delta * (amount - mean)
        self._txn_amount_stats[user_id] = (mean, m2, n)

    def prior_events(self, user_id: str, before_ts: datetime) -> list[dict]:
        return [e for e in self._events[user_id] if datetime.fromisoformat(e["timestamp"]) < before_ts]

    def known_devices(self, user_id: str) -> set[str]:
        return self._known_devices[user_id]

    def known_ips(self, user_id: str) -> set[str]:
        return self._known_ips[user_id]

    def txn_zscore(self, user_id: str, amount: float) -> float:
        mean, m2, n = self._txn_amount_stats.get(user_id, (0.0, 0.0, 0))
        if n < 2:
            return 0.0
        std = math.sqrt(m2 / (n - 1)) or 1e-6
        return (amount - mean) / std


def _cyclical(value: float, period: float) -> tuple[float, float]:
    angle = 2 * math.pi * (value / period)
    return math.sin(angle), math.cos(angle)


def compute_features(event: dict, history: UserBehaviorHistory) -> np.ndarray:
    """
    Compute the frozen FEATURE_NAMES vector for a single event, using only
    events observed strictly before it (causal). Call `history.observe(event)`
    AFTER scoring to update state for subsequent events.
    """
    user_id = event["user_id"]
    ts = datetime.fromisoformat(event["timestamp"])
    prior = history.prior_events(user_id, ts)

    hour_sin, hour_cos = _cyclical(ts.hour + ts.minute / 60, 24)
    dow_sin, dow_cos = _cyclical(ts.weekday(), 7)

    seconds_since_last = 86400.0  # default: "never seen before" -> treat as a large gap
    if prior:
        last_ts = datetime.fromisoformat(prior[-1]["timestamp"])
        seconds_since_last = min((ts - last_ts).total_seconds(), 86400.0)

    def _count_since(delta: timedelta, predicate=lambda e: True) -> int:
        cutoff = ts - delta
        return sum(1 for e in prior if datetime.fromisoformat(e["timestamp"]) >= cutoff and predicate(e))

    events_5m = _count_since(timedelta(minutes=5))
    events_1h = _count_since(timedelta(hours=1))
    events_24h = _count_since(timedelta(hours=24))

    logins_24h = _count_since(timedelta(hours=24), lambda e: e.get("event_type") == "login")
    login_attempts_24h = [
        e for e in prior
        if datetime.fromisoformat(e["timestamp"]) >= ts - timedelta(hours=24)
        and e.get("event_type") == "login"
    ]
    failed_ratio = (
        sum(1 for e in login_attempts_24h if e.get("login_success") is False) / len(login_attempts_24h)
        if login_attempts_24h else 0.0
    )

    txns_1h = [
        e for e in prior
        if datetime.fromisoformat(e["timestamp"]) >= ts - timedelta(hours=1)
        and e.get("event_type") == "transaction"
    ]
    txn_count_1h = len(txns_1h)
    txn_amount_sum_1h = sum(e.get("txn_amount") or 0.0 for e in txns_1h)

    txn_zscore = 0.0
    if event.get("event_type") == "transaction" and event.get("txn_amount") is not None:
        txn_zscore = history.txn_zscore(user_id, event["txn_amount"])

    window_24h = [e for e in prior if datetime.fromisoformat(e["timestamp"]) >= ts - timedelta(hours=24)]
    distinct_devices_24h = len({e["device_id"] for e in window_24h if e.get("device_id")})
    distinct_ips_24h = len({e["ip_address"] for e in window_24h if e.get("ip_address")})
    distinct_beneficiaries_24h = len({e["beneficiary_id"] for e in window_24h if e.get("beneficiary_id")})

    is_new_device = float(event.get("device_id") not in history.known_devices(user_id))
    is_new_ip = float(event.get("ip_address") not in history.known_ips(user_id))

    if prior:
        first_ts = datetime.fromisoformat(prior[0]["timestamp"])
        account_age_days = (ts - first_ts).days
    else:
        account_age_days = 0
    account_age_bucket = min(account_age_days, 365) / 365.0  # normalized [0, 1]

    return np.array([
        hour_sin, hour_cos, dow_sin, dow_cos,
        seconds_since_last / 86400.0,
        min(events_5m, 50) / 50.0,
        min(events_1h, 200) / 200.0,
        min(events_24h, 500) / 500.0,
        min(logins_24h, 50) / 50.0,
        failed_ratio,
        min(txn_count_1h, 50) / 50.0,
        min(txn_amount_sum_1h, 500000.0) / 500000.0,
        max(min(txn_zscore, 10.0), -10.0) / 10.0,
        min(distinct_devices_24h, 10) / 10.0,
        min(distinct_ips_24h, 10) / 10.0,
        min(distinct_beneficiaries_24h, 20) / 20.0,
        is_new_device, is_new_ip,
        account_age_bucket,
    ], dtype=np.float32)


def build_feature_matrix(events: list[dict]) -> tuple[np.ndarray, list[str]]:
    """
    Batch feature builder for training: replays events in timestamp order,
    computing causal features for each and updating history as it goes —
    mirrors exactly what happens online, so train/serve skew is minimized.
    """
    events_sorted = sorted(events, key=lambda e: e["timestamp"])
    history = UserBehaviorHistory()
    rows, event_ids = [], []
    for e in events_sorted:
        rows.append(compute_features(e, history))
        event_ids.append(e["event_id"])
        history.observe(e)
    X = np.vstack(rows) if rows else np.zeros((0, N_FEATURES), dtype=np.float32)
    return X, event_ids