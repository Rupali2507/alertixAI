from diffprivlib.mechanisms import Laplace
import pandas as pd

def add_dp_noise(value: float, epsilon: float = 1.0, sensitivity: float = 1.0) -> float:
    """
    Adds Laplace-mechanism differential-privacy noise to a single numeric value.
    Lower epsilon = more privacy, more noise. epsilon=1.0 is a common default.
    """
    mechanism = Laplace(epsilon=epsilon, sensitivity=sensitivity)
    return mechanism.randomise(value)

def dp_aggregate_mean(values: list[float], epsilon: float = 1.0) -> float:
    """
    Computes a differentially-private mean over a list of values.
    Sensitivity is estimated from the value range (bounded), a simplification
    reasonable for a demo — production would use a fixed, known bound.
    """
    if not values:
        return 0.0
    true_mean = sum(values) / len(values)
    value_range = max(values) - min(values) if len(values) > 1 else 1.0
    sensitivity = value_range / len(values) if len(values) > 0 else 1.0
    return add_dp_noise(true_mean, epsilon=epsilon, sensitivity=max(sensitivity, 0.01))

def dp_aggregate_count(count: int, epsilon: float = 1.0) -> float:
    """DP-noised count, sensitivity=1 since one record changes count by at most 1."""
    mechanism = Laplace(epsilon=epsilon, sensitivity=1.0)
    return mechanism.randomise(float(count))