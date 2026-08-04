import json
import sys
import os
import time
from kafka import KafkaConsumer

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from feature_store.store import write_batch

TOPIC = "identity-events"
BOOTSTRAP_SERVERS = "localhost:9093"
BATCH_SIZE = 20
FLUSH_INTERVAL_SEC = 5

def run():
    consumer = KafkaConsumer(
        TOPIC,
        bootstrap_servers=BOOTSTRAP_SERVERS,
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
        auto_offset_reset="earliest",
        enable_auto_commit=True,
        group_id="feature-store-writer",
        consumer_timeout_ms=1000,  # allows periodic flush even if idle
    )

    buffer = []
    last_flush = time.time()

    print("Consumer started. Listening on topic:", TOPIC)

    try:
        while True:
            for message in consumer:
                buffer.append(message.value)
                if len(buffer) >= BATCH_SIZE:
                    write_batch(buffer)
                    buffer = []
                    last_flush = time.time()

            # consumer_timeout_ms causes loop to exit here if no messages;
            # flush any partial buffer on interval
            if buffer and (time.time() - last_flush) >= FLUSH_INTERVAL_SEC:
                write_batch(buffer)
                buffer = []
                last_flush = time.time()

    except KeyboardInterrupt:
        print("Stopped by user.")
        if buffer:
            write_batch(buffer)
    finally:
        consumer.close()

if __name__ == "__main__":
    run()