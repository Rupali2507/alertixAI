import json
import time
from kafka import KafkaProducer
from event_generator import generate_event

TOPIC = "identity-events"
BOOTSTRAP_SERVERS = "localhost:9093"  # matches docker-compose host mapping

def get_producer():
    return KafkaProducer(
        bootstrap_servers=BOOTSTRAP_SERVERS,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        key_serializer=lambda k: k.encode("utf-8") if k else None,
    )

def run(rate_per_sec: float = 5, duration_sec: int = None):
    producer = get_producer()
    delay = 1 / rate_per_sec
    count = 0
    start = time.time()

    try:
        while True:
            event = generate_event()
            producer.send(TOPIC, key=event["user_id"], value=event)
            count += 1
            if count % 20 == 0:
                print(f"Sent {count} events...")
            if duration_sec and (time.time() - start) > duration_sec:
                break
            time.sleep(delay)
    except KeyboardInterrupt:
        print("Stopped by user.")
    finally:
        producer.flush()
        producer.close()
        print(f"Total events sent: {count}")

if __name__ == "__main__":
    run(rate_per_sec=5)