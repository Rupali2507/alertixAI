import os
import pandas as pd
from datetime import datetime, timezone

STORE_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(STORE_DIR, exist_ok=True)

def _partition_path(event_type: str, dt: datetime) -> str:
    """Partition by event_type and date, versioned by write batch."""
    date_str = dt.strftime("%Y-%m-%d")
    partition_dir = os.path.join(STORE_DIR, f"event_type={event_type}", f"date={date_str}")
    os.makedirs(partition_dir, exist_ok=True)
    return partition_dir

def write_batch(events: list[dict]):
    """Write a batch of events to Parquet, partitioned by event_type/date."""
    if not events:
        return

    df = pd.DataFrame(events)
    df["timestamp"] = pd.to_datetime(df["timestamp"])

    for event_type, group in df.groupby("event_type"):
        # naive assumption: all events in a batch share roughly the same date
        dt = group["timestamp"].iloc[0].to_pydatetime()
        partition_dir = _partition_path(event_type, dt)
        filename = f"batch_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%f')}.parquet"
        filepath = os.path.join(partition_dir, filename)
        group.to_parquet(filepath, index=False)
        print(f"Wrote {len(group)} '{event_type}' events -> {filepath}")

def read_all(event_type: str = None) -> pd.DataFrame:
    """Read all stored events, optionally filtered by event_type."""
    import glob
    pattern = os.path.join(STORE_DIR, f"event_type={event_type or '*'}", "**", "*.parquet")
    files = glob.glob(pattern, recursive=True)
    if not files:
        return pd.DataFrame()
    return pd.concat([pd.read_parquet(f) for f in files], ignore_index=True)