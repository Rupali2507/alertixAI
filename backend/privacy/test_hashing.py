from hashing import hash_pii, hash_event_pii

# same input -> same hash (deterministic, joinable)
h1 = hash_pii("user_42")
h2 = hash_pii("user_42")
print("Deterministic:", h1 == h2)
print("Hash sample:", h1)

event = {
    "event_id": "evt1",
    "user_id": "user_42",
    "device_id": "device_9",
    "ip_address": "1.2.3.4",
    "txn_amount": 500.0,
}
hashed = hash_event_pii(event)
print(hashed)