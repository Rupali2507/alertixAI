from differential_privacy import dp_aggregate_mean, dp_aggregate_count

txn_amounts = [500, 1200, 300, 4500, 800, 2200, 150]

true_mean = sum(txn_amounts) / len(txn_amounts)
dp_mean = dp_aggregate_mean(txn_amounts, epsilon=1.0)
print(f"True mean: {true_mean:.2f}")
print(f"DP mean:   {dp_mean:.2f}")

true_count = len(txn_amounts)
dp_count = dp_aggregate_count(true_count, epsilon=1.0)
print(f"True count: {true_count}")
print(f"DP count:   {dp_count:.2f}")