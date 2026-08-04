from store import read_all

df = read_all()
print(f"Total events in store: {len(df)}")
print(df["event_type"].value_counts())
print(df.head())