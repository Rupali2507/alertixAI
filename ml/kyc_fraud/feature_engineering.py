"""
Feature engineering for the KYC/onboarding-fraud detector.

Unlike the behavioral detector (reasons about one user's activity over
time) and device trust (reasons about the identity graph), KYC fraud
reasons about a single onboarding/KYC-change EVENT in the context of the
wider population — the signature failure mode here is synthetic identity /
identity-field reuse across accounts (same PAN/phone/address stitched onto
multiple "different" users), which only shows up when you look across
users, not within one.

Weak-label heuristic for training (see train.py): CatBoost needs labels,
and this demo has no analyst-confirmed fraud labels, so train.py derives
weak labels from these same population-level duplicate/velocity signals.
This is standard practice for cold-start fraud systems — bootstrap on
heuristic labels, then replace with confirmed case outcomes once the
system is live (see docs/scope_statement.md's build-vs-architect split;
this is a documented day-1 limitation, not a hidden flaw).
"""

from __future__ import annotations
from collections import defaultdict
from datetime import timedelta

import numpy as np
import pandas as pd

FEATURE_NAMES = [
    "kyc_field_change_count_7d",
    "distinct_kyc_fields_changed_7d",
    "hours_since_account_creation",
    "kyc_change_velocity",       # changes per day since account creation
    "shared_pan_hash_user_count",
    "shared_phone_hash_user_count",
    "shared_address_hash_user_count",
    "shared_device_user_count",
    "is_pan_number_field",
    "is_address_field",
    "is_phone_field",
    "is_email_field",
    "onboarding_to_transaction_gap_hours",
]
N_FEATURES = len(FEATURE_NAMES)

# NOTE: hashed_pan / hashed_phone / hashed_address are not yet present in
# ingestion/schemas/event_schema.json. These three population indices are
# wired up and ready — they'll populate automatically the moment Ratnesh
# adds hashed identity fields to the event schema (backend/privacy/hashing.py
# already has the salted-HMAC machinery for this). Until then they safely
# no-op to 0, degrading gracefully rather than breaking.


def build_kyc_features(events: list[dict]) -> tuple[np.ndarray, list[str], pd.DataFrame]:
    """
    Builds the KYC feature matrix across the full event set, since several
    features (shared_*_user_count) are inherently population-level and
    can't be computed causally per-event without first indexing the whole
    batch. Returns (X, event_ids, raw_df).
    """
    df = pd.DataFrame(events)
    if df.empty:
        return np.zeros((0, N_FEATURES), dtype=np.float32), [], df

    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp").reset_index(drop=True)

    pan_users, phone_users, address_users, device_users = (
        defaultdict(set), defaultdict(set), defaultdict(set), defaultdict(set)
    )
    for _, row in df.iterrows():
        if row.get("device_id"):
            device_users[row["device_id"]].add(row["user_id"])
        for field, index in (
            ("hashed_pan", pan_users), ("hashed_phone", phone_users), ("hashed_address", address_users),
        ):
            val = row.get(field)
            if val:
                index[val].add(row["user_id"])

    account_first_seen: dict[str, "pd.Timestamp"] = {}
    first_txn_ts: dict[str, "pd.Timestamp"] = {}
    for _, row in df.iterrows():
        uid = row["user_id"]
        account_first_seen.setdefault(uid, row["timestamp"])
        if row.get("event_type") == "transaction" and uid not in first_txn_ts:
            first_txn_ts[uid] = row["timestamp"]

    kyc_change_history: dict[str, list] = defaultdict(list)
    kyc_field_history: dict[str, list[str]] = defaultdict(list)

    rows, event_ids = [], []
    for _, row in df.iterrows():
        if row.get("event_type") != "onboarding":
            continue  # KYC detector only scores onboarding/KYC-change events

        uid, ts = row["user_id"], row["timestamp"]
        field_changed = row.get("kyc_field_changed")

        cutoff = ts - timedelta(days=7)
        recent_changes = [t for t in kyc_change_history[uid] if t >= cutoff]
        recent_fields = {f for t, f in zip(kyc_change_history[uid], kyc_field_history[uid]) if t >= cutoff}

        creation = account_first_seen.get(uid, ts)
        hours_since_creation = max((ts - creation).total_seconds() / 3600, 0.01)
        change_velocity = (len(recent_changes) + 1) / (hours_since_creation / 24 + 0.01)

        pan_count = len(pan_users.get(row.get("hashed_pan"), set()))
        phone_count = len(phone_users.get(row.get("hashed_phone"), set()))
        addr_count = len(address_users.get(row.get("hashed_address"), set()))
        device_count = len(device_users.get(row.get("device_id"), set()))

        first_txn = first_txn_ts.get(uid)
        onboarding_to_txn_gap = (
            (first_txn - ts).total_seconds() / 3600 if first_txn is not None and first_txn >= ts else 999.0
        )

        rows.append(np.array([
            min(len(recent_changes), 20) / 20.0,
            min(len(recent_fields), 4) / 4.0,
            min(hours_since_creation, 24 * 90) / (24 * 90),
            min(change_velocity, 10) / 10.0,
            min(max(pan_count - 1, 0), 10) / 10.0,
            min(max(phone_count - 1, 0), 10) / 10.0,
            min(max(addr_count - 1, 0), 10) / 10.0,
            min(max(device_count - 1, 0), 10) / 10.0,
            float(field_changed == "pan_number"),
            float(field_changed == "address"),
            float(field_changed == "phone"),
            float(field_changed == "email"),
            min(onboarding_to_txn_gap, 999.0) / 999.0,
        ], dtype=np.float32))
        event_ids.append(row["event_id"])

        kyc_change_history[uid].append(ts)
        kyc_field_history[uid].append(field_changed)

    X = np.vstack(rows) if rows else np.zeros((0, N_FEATURES), dtype=np.float32)
    return X, event_ids, df


def weak_fraud_labels(X: np.ndarray) -> np.ndarray:
    """
    Heuristic weak labels for bootstrapping CatBoost in the absence of
    analyst-confirmed ground truth (see module docstring). Flags a row as
    weakly positive if it shows the population-level duplicate-identity
    signal OR an aggressive KYC-then-immediate-transaction pattern (a
    classic synthetic-identity "burst and cash out" signature) — both are
    domain-established fraud indicators independent of any labeled data.
    """
    if len(X) == 0:
        return np.zeros(0, dtype=np.int64)
    idx = {name: i for i, name in enumerate(FEATURE_NAMES)}
    shared_identity = (
        (X[:, idx["shared_pan_hash_user_count"]] > 0) |
        (X[:, idx["shared_phone_hash_user_count"]] > 0) |
        (X[:, idx["shared_address_hash_user_count"]] > 0)
    )
    burst_pattern = (
        (X[:, idx["kyc_change_velocity"]] > 0.3) &
        (X[:, idx["onboarding_to_transaction_gap_hours"]] < (6 / 999.0))
    )
    return (shared_identity | burst_pattern).astype(np.int64)