import random
import uuid
from datetime import datetime, timezone
from faker import Faker

fake = Faker()

USERS = [f"user_{i}" for i in range(1, 51)]
DEVICES = [f"device_{i}" for i in range(1, 80)]
IPS = [fake.ipv4() for _ in range(60)]

def generate_event() -> dict:
    event_type = random.choices(
        ["login", "transaction", "onboarding", "admin_action"],
        weights=[0.5, 0.35, 0.1, 0.05]
    )[0]

    event = {
        "event_id": str(uuid.uuid4()),
        "event_type": event_type,
        "user_id": random.choice(USERS),
        "device_id": random.choice(DEVICES),
        "ip_address": random.choice(IPS),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "login_success": None,
        "txn_amount": None,
        "txn_currency": None,
        "beneficiary_id": None,
        "kyc_field_changed": None,
        "admin_action_type": None,
    }

    if event_type == "login":
        event["login_success"] = random.random() > 0.05
    elif event_type == "transaction":
        event["txn_amount"] = round(random.expovariate(1 / 2000), 2)
        event["txn_currency"] = "INR"
        event["beneficiary_id"] = f"benef_{random.randint(1, 200)}"
    elif event_type == "onboarding":
        event["kyc_field_changed"] = random.choice(["address", "phone", "pan_number", "email"])
    elif event_type == "admin_action":
        event["admin_action_type"] = random.choice(["balance_override", "mass_export", "kyc_override"])

    return event

if __name__ == "__main__":
    for _ in range(5):
        print(generate_event())