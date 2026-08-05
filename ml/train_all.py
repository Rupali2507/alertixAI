"""
Trains all four detectors in sequence against the feature store, in the
order least-to-most heavy-dependency so a partial environment still trains
what it can:

  1. insider_misuse (sklearn only)
  2. behavioral (sklearn + optional torch)
  3. kyc_fraud (sklearn/catboost + optional shap)
  4. device_trust (torch + torch_geometric — heaviest, run last)

Run from the repo root: `python -m ml.train_all`
"""

from __future__ import annotations
import traceback

STEPS = [
    ("insider_misuse", "ml.insider_misuse.cohort_isolation_forest", None),
    ("behavioral", "ml.behavioral.train", "main"),
    ("kyc_fraud", "ml.kyc_fraud.train", "main"),
    ("device_trust", "ml.device_trust.train", "main"),
]


def _train_insider_misuse():
    import os
    from feature_store.store import read_all
    from ml.insider_misuse.cohort_isolation_forest import CohortIsolationForestDetector

    events = read_all().to_dict("records")
    if not events:
        raise RuntimeError("No events in feature store — run ingestion before training.")
    artifact_dir = os.path.join(os.path.dirname(__file__), "insider_misuse", "artifacts")
    os.makedirs(artifact_dir, exist_ok=True)
    print(f"Training insider-misuse cohort model on {len(events)} events...")
    det = CohortIsolationForestDetector().fit(events)
    det.save(artifact_dir)
    print(f"Saved insider-misuse detector artifacts to {artifact_dir}")


def main():
    results = {}
    for name, module_path, entry in STEPS:
        print(f"\n{'=' * 60}\nTraining detector: {name}\n{'=' * 60}")
        try:
            if entry is None:
                _train_insider_misuse()
            else:
                import importlib
                module = importlib.import_module(module_path)
                getattr(module, entry)()
            results[name] = "OK"
        except ImportError as e:
            print(f"[{name}] SKIPPED — missing optional dependency: {e}")
            results[name] = f"SKIPPED ({e})"
        except Exception as e:
            print(f"[{name}] FAILED: {e}")
            traceback.print_exc()
            results[name] = f"FAILED ({e})"

    print(f"\n{'=' * 60}\nTraining summary\n{'=' * 60}")
    for name, status in results.items():
        print(f"  {name:<16} {status}")


if __name__ == "__main__":
    main()