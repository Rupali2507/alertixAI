"""
seed_and_train.py — Muskan's one-shot bootstrap script.

Generates a rich synthetic dataset directly into the feature store and then
trains all four detectors in sequence.  Run this from the repo root ONCE
before starting the FastAPI server so score.py can load real artifacts
instead of falling back to mock detectors.

    python scripts/seed_and_train.py                # default 3 000 events
    python scripts/seed_and_train.py --n 10000      # larger run
    python scripts/seed_and_train.py --skip-gnn     # skip device-trust GNN (no torch/torch_geometric)

Each detector saves its artifacts under ml/<detector>/artifacts/ and
score.py will pick them up automatically on next startup.
"""

from __future__ import annotations
import argparse
import os
import random
import sys
import traceback
import uuid
from datetime import datetime, timedelta, timezone
from collections import defaultdict

# ── make repo root importable regardless of cwd ────────────────────────────
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from feature_store.store import write_batch, read_all

# ── constants ───────────────────────────────────────────────────────────────
N_USERS = 80
N_DEVICES = 120
N_IPS = 90
N_ADMIN_USERS = 12
ADMIN_ROLES = ["kyc_ops", "support", "fraud_analyst", "manager"]

FRAUD_USER_FRACTION = 0.08   # ~8 % of users are "bad actors" — injected anomalies
ONBOARDING_KYC_FRAUD_FRACTION = 0.12  # fraction of onboarding events are fraudulent

random.seed(42)

USERS = [f"user_{i}" for i in range(1, N_USERS + 1)]
DEVICES = [f"device_{i}" for i in range(1, N_DEVICES + 1)]
IPS = [f"10.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}" for _ in range(N_IPS)]
ADMIN_USERS = [f"admin_{i}" for i in range(1, N_ADMIN_USERS + 1)]
ADMIN_ROLE_MAP = {u: random.choice(ADMIN_ROLES) for u in ADMIN_USERS}

# device farm: a few devices/IPs shared across many unrelated users (suspicious)
FARM_DEVICES = [f"device_{N_DEVICES + k}" for k in range(1, 4)]
FARM_IPS = [IPS[0], IPS[1]]  # shared across many users

# fraudulent users — fixed set for reproducibility
BAD_USER_IDS = random.sample(USERS, max(1, int(N_USERS * FRAUD_USER_FRACTION)))
BAD_ADMIN_IDS = random.sample(ADMIN_USERS, max(1, int(N_ADMIN_USERS * 0.15)))

# stable user->device mapping (users mostly use the same 1-3 devices)
_user_primary_devices: dict[str, list[str]] = {}
for u in USERS:
    k = random.randint(1, 3)
    _user_primary_devices[u] = random.sample(DEVICES, k)


def _ts(days_ago: float = 0, hours_offset: float = 0) -> str:
    """ISO timestamp at some offset before now."""
    t = datetime.now(timezone.utc) - timedelta(days=days_ago, hours=hours_offset)
    return t.isoformat()


def _device_for(user_id: str, is_bad: bool = False) -> str:
    if is_bad and random.random() < 0.4:
        return random.choice(FARM_DEVICES)
    if random.random() < 0.15:                # occasional new device
        return random.choice(DEVICES)
    return random.choice(_user_primary_devices[user_id])


def _ip_for(is_bad: bool = False) -> str:
    if is_bad and random.random() < 0.35:
        return random.choice(FARM_IPS)
    return random.choice(IPS)


# ── event builders ───────────────────────────────────────────────────────────

def make_login(user_id: str, days_ago: float) -> dict:
    is_bad = user_id in BAD_USER_IDS
    # bad actors log in at odd hours
    hour_offset = random.uniform(20, 27) if is_bad and random.random() < 0.5 else random.uniform(0, 16)
    return {
        "event_id": str(uuid.uuid4()),
        "event_type": "login",
        "user_id": user_id,
        "device_id": _device_for(user_id, is_bad),
        "ip_address": _ip_for(is_bad),
        "timestamp": _ts(days_ago, hour_offset),
        "login_success": False if (is_bad and random.random() < 0.20) else (random.random() > 0.04),
        "txn_amount": None, "txn_currency": None, "beneficiary_id": None,
        "kyc_field_changed": None, "admin_action_type": None,
        "admin_role": None,
    }


def make_transaction(user_id: str, days_ago: float) -> dict:
    is_bad = user_id in BAD_USER_IDS
    # bad actors send larger, round amounts to concentrated beneficiaries
    if is_bad and random.random() < 0.6:
        amount = round(random.choice([49000, 99000, 150000, 500000]) + random.uniform(-50, 50), 2)
        benef = f"benef_{random.randint(1, 5)}"  # concentrated
    else:
        amount = round(random.expovariate(1 / 2000), 2)
        benef = f"benef_{random.randint(1, 200)}"
    return {
        "event_id": str(uuid.uuid4()),
        "event_type": "transaction",
        "user_id": user_id,
        "device_id": _device_for(user_id, is_bad),
        "ip_address": _ip_for(is_bad),
        "timestamp": _ts(days_ago),
        "login_success": None,
        "txn_amount": amount,
        "txn_currency": "INR",
        "beneficiary_id": benef,
        "kyc_field_changed": None, "admin_action_type": None,
        "admin_role": None,
    }


def make_onboarding(user_id: str, days_ago: float, inject_fraud: bool = False) -> dict:
    """KYC onboarding event.  inject_fraud=True creates signals used by weak_fraud_labels."""
    import hashlib
    is_bad = inject_fraud or user_id in BAD_USER_IDS
    # reuse PAN / phone across accounts for bad actors
    pan = f"AAAPZ{random.randint(1000,9999)}Q" if not is_bad else "AAAPZ1234Q"
    phone = f"9{random.randint(100000000, 999999999)}" if not is_bad else "9999999999"
    address = f"{random.randint(100, 999)} Normal St" if not is_bad else "456 Duplicate Rd"
    # provide both raw and pre-hashed versions so KYC feature_engineering
    # can build the population-level duplicate-identity indices
    def _sha(v: str) -> str:
        return hashlib.sha256(v.encode()).hexdigest()
    return {
        "event_id": str(uuid.uuid4()),
        "event_type": "onboarding",
        "user_id": user_id,
        "device_id": _device_for(user_id, is_bad),
        "ip_address": _ip_for(is_bad),
        "timestamp": _ts(days_ago),
        "login_success": None,
        "txn_amount": None,
        "txn_currency": None,
        "beneficiary_id": None,
        "kyc_field_changed": random.choice(["address", "phone", "pan_number", "email"]),
        "admin_action_type": None,
        "admin_role": None,
        # raw KYC identity fields
        "pan_number": pan,
        "phone_number": phone,
        "address": address,
        # pre-hashed identity fields used by KYC feature_engineering
        # to build population-level shared-identity indices
        "hashed_pan": _sha(pan),
        "hashed_phone": _sha(phone),
        "hashed_address": _sha(address),
        "kyc_edit_count_7d": random.randint(3, 8) if is_bad else random.randint(0, 1),
        "time_since_last_kyc_edit_hours": random.uniform(0, 4) if is_bad else random.uniform(24, 720),
        "rapid_kyc_to_txn": is_bad and random.random() < 0.7,
    }


def make_admin_action(admin_id: str, days_ago: float, inject_misuse: bool = False) -> dict:
    is_bad = inject_misuse or admin_id in BAD_ADMIN_IDS
    if is_bad and random.random() < 0.6:
        action = random.choice(["mass_export", "balance_override", "kyc_override"])
        amount = 75000 if action == "balance_override" else None
        # bad admins act off-hours
        hour = random.uniform(21, 26)
    else:
        action = random.choices(
            ["balance_override", "mass_export", "kyc_override"],
            weights=[0.1, 0.05, 0.15]
        )[0] if random.random() < 0.05 else "view_account"
        amount = None
        hour = random.uniform(8, 18)
    return {
        "event_id": str(uuid.uuid4()),
        "event_type": "admin_action",
        "user_id": admin_id,
        "device_id": f"admin_device_{random.randint(1, 20)}",
        "ip_address": _ip_for(is_bad),
        "timestamp": _ts(days_ago, hour),
        "login_success": None,
        "txn_amount": amount,
        "txn_currency": None,
        "beneficiary_id": None,
        "kyc_field_changed": None,
        "admin_action_type": action,
        "admin_role": ADMIN_ROLE_MAP.get(admin_id, "support"),
    }


# ── generator ────────────────────────────────────────────────────────────────

def generate_events(n: int = 3000) -> list[dict]:
    """
    Produce n synthetic events spanning the last 30 days.

    Mix: ~50% login, ~35% transaction, ~10% onboarding, ~5% admin.
    Fraud injection: ~8% of login/txn events are from BAD_USER_IDS,
    ~12% of onboarding events have KYC fraud signals, ~15% of admin
    events have insider-misuse signals.
    """
    events: list[dict] = []
    print(f"Generating {n} synthetic events...")

    for i in range(n):
        days_ago = random.uniform(0, 30)
        r = random.random()

        if r < 0.50:      # login
            u = random.choice(USERS)
            events.append(make_login(u, days_ago))

        elif r < 0.85:    # transaction
            u = random.choice(USERS)
            events.append(make_transaction(u, days_ago))

        elif r < 0.95:    # onboarding / KYC
            u = random.choice(USERS)
            inject = random.random() < ONBOARDING_KYC_FRAUD_FRACTION
            events.append(make_onboarding(u, days_ago, inject_fraud=inject))

        else:             # admin action
            a = random.choice(ADMIN_USERS)
            inject = a in BAD_ADMIN_IDS and random.random() < 0.5
            events.append(make_admin_action(a, days_ago, inject_misuse=inject))

    # ensure at least MIN_COHORT_SIZE=10 admin events per role for cohort model
    for role in ADMIN_ROLES:
        role_admins = [u for u, r in ADMIN_ROLE_MAP.items() if r == role]
        for _ in range(12):
            a = random.choice(role_admins)
            events.append(make_admin_action(a, random.uniform(0, 14)))

    print(f"  -> {len(events)} total events ({sum(1 for e in events if e['event_type']=='login')} login, "
          f"{sum(1 for e in events if e['event_type']=='transaction')} txn, "
          f"{sum(1 for e in events if e['event_type']=='onboarding')} onboarding, "
          f"{sum(1 for e in events if e['event_type']=='admin_action')} admin)")
    return events


# ── training ────────────────────────────────────────────────────────────────

def _train_insider(events: list[dict]) -> str:
    from ml.insider_misuse.cohort_isolation_forest import CohortIsolationForestDetector
    artifact_dir = os.path.join(ROOT, "ml", "insider_misuse", "artifacts")
    os.makedirs(artifact_dir, exist_ok=True)
    admin_events = [e for e in events if e.get("event_type") == "admin_action"]
    print(f"  Using {len(admin_events)} admin_action events for insider-misuse cohort model")
    det = CohortIsolationForestDetector().fit(events)
    det.save(artifact_dir)
    return artifact_dir


def _train_behavioral(events: list[dict]) -> str:
    from ml.behavioral.train import BehavioralDetector
    artifact_dir = os.path.join(ROOT, "ml", "behavioral", "artifacts")
    os.makedirs(artifact_dir, exist_ok=True)
    det = BehavioralDetector().fit(events)
    det.save(artifact_dir)
    return artifact_dir


def _train_kyc(events: list[dict]) -> str:
    from ml.kyc_fraud.train import KYCFraudDetector
    artifact_dir = os.path.join(ROOT, "ml", "kyc_fraud", "artifacts")
    os.makedirs(artifact_dir, exist_ok=True)
    onboarding = [e for e in events if e.get("event_type") == "onboarding"]
    print(f"  Using {len(onboarding)} onboarding events for KYC fraud detector")
    det = KYCFraudDetector().fit(events)
    det.save(artifact_dir)
    return artifact_dir


def _train_device_trust(events: list[dict]) -> str:
    from ml.device_trust.train import DeviceTrustDetector
    artifact_dir = os.path.join(ROOT, "ml", "device_trust", "artifacts")
    os.makedirs(artifact_dir, exist_ok=True)
    det = DeviceTrustDetector().fit(events)
    det.save(artifact_dir)
    return artifact_dir


STEPS = [
    ("insider_misuse",  _train_insider),
    ("behavioral",      _train_behavioral),
    ("kyc_fraud",       _train_kyc),
    ("device_trust",    _train_device_trust),
]


def train_all(events: list[dict], skip_gnn: bool = False) -> dict[str, str]:
    results = {}
    for name, fn in STEPS:
        if skip_gnn and name == "device_trust":
            print(f"\n[{name}] SKIPPED (--skip-gnn)")
            results[name] = "SKIPPED"
            continue
        print(f"\n{'=' * 60}\nTraining detector: {name}\n{'=' * 60}")
        try:
            artifact_dir = fn(events)
            results[name] = f"OK -> {artifact_dir}"
        except ImportError as e:
            print(f"[{name}] SKIPPED - missing optional dependency: {e}")
            results[name] = f"SKIPPED ({e})"
        except Exception as e:
            print(f"[{name}] FAILED: {e}")
            traceback.print_exc()
            results[name] = f"FAILED ({e})"
    return results


# ── entry point ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Seed feature store and train all AlertixAI detectors.")
    parser.add_argument("--n", type=int, default=3000, help="Number of synthetic events to generate (default: 3000)")
    parser.add_argument("--skip-gnn", action="store_true", help="Skip device-trust GNN (no torch/torch_geometric installed)")
    parser.add_argument("--seed-only", action="store_true", help="Only generate data into feature store, don't train")
    parser.add_argument("--train-only", action="store_true", help="Skip generation, train on existing feature store data")
    args = parser.parse_args()

    # ── step 1: seed ──
    if not args.train_only:
        events = generate_events(args.n)
        print("\nWriting events to feature store...")
        write_batch(events)
        print("Feature store seeded.\n")
    else:
        print("Loading existing events from feature store…")
        df = read_all()
        if df.empty:
            print("ERROR: feature store is empty. Run without --train-only first.")
            sys.exit(1)
        events = df.to_dict("records")
        print(f"  Loaded {len(events)} events from store.\n")

    if args.seed_only:
        print("--seed-only: done.")
        return

    # ── step 2: train ──
    results = train_all(events, skip_gnn=args.skip_gnn)

    print(f"\n{'=' * 60}\nTraining summary\n{'=' * 60}")
    for name, status in results.items():
        print(f"  {name:<16} {status}")

    any_ok = any(s.startswith("OK") for s in results.values())
    if any_ok:
        print("\nArtifacts saved. Restart the FastAPI server — score.py will load real models automatically.")
    else:
        print("\nAll detectors failed or were skipped. Check errors above.")


if __name__ == "__main__":
    main()
