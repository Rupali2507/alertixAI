"""
Per-cohort Isolation Forest for insider misuse — complements the
deterministic rule engine (rules.py) with a statistical layer that catches
patterns the fixed rules don't explicitly encode.

Why per-cohort rather than one global model: "normal" admin behavior
varies a lot by role/team (a KYC-ops admin doing 20 kyc_overrides/day is
routine; a support agent doing the same is alarming). Pooling all admins
into one IsolationForest forces a single global notion of "normal" and
either misses role-appropriate outliers or over-flags legitimate
high-volume roles. Cohorting first (by declared role, falling back to a
shared default cohort if role isn't available) lets each peer group set
its own baseline — the standard "peer-group anomaly detection" pattern
from insider-threat literature: compare a user only to people who do
similar work.

Combined with rules.py in the orchestrator: rule violations are
deterministic/explainable escalations that always fire, while this model
supplies a continuous risk signal + reason code for behavior that's
anomalous-but-not-yet-rule-breaking (e.g. unusually high override volume
that hasn't crossed the mass-export threshold yet) — an early-warning
layer, not a replacement for the rules.
"""

from __future__ import annotations
from collections import defaultdict
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

from ml.interfaces.detector_base import BaseDetector
from ml.interfaces.model_schema import DetectorScore
from ml.insider_misuse.rules import InsiderMisuseRuleEngine

FEATURE_NAMES = [
    "admin_actions_last_24h",
    "balance_overrides_last_24h",
    "kyc_overrides_last_24h",
    "mass_exports_last_24h",
    "off_hours_action_ratio_7d",   # actions between 20:00-06:00
    "distinct_action_types_7d",
]
N_FEATURES = len(FEATURE_NAMES)
DEFAULT_COHORT = "default"  # used when no explicit role/cohort field is present on the event


def _cohort_of(event: dict) -> str:
    return event.get("admin_role") or event.get("cohort") or DEFAULT_COHORT


def build_cohort_features(events: list[dict]) -> tuple[dict[str, np.ndarray], dict[str, list[str]]]:
    """Returns per-cohort feature matrices, built causally in timestamp order (mirrors the behavioral module)."""
    admin_events = [e for e in events if e.get("event_type") == "admin_action"]
    df = pd.DataFrame(admin_events)
    if df.empty:
        return {}, {}
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp").reset_index(drop=True)

    history: dict[str, list[dict]] = defaultdict(list)
    cohort_rows: dict[str, list[np.ndarray]] = defaultdict(list)
    cohort_event_ids: dict[str, list[str]] = defaultdict(list)

    for _, row in df.iterrows():
        event = row.to_dict()
        user_id, cohort, ts = event["user_id"], _cohort_of(event), row["timestamp"]

        prior_24h = [e for e in history[user_id] if e["timestamp"] >= ts - timedelta(hours=24)]
        prior_7d = [e for e in history[user_id] if e["timestamp"] >= ts - timedelta(days=7)]

        off_hours = sum(1 for e in prior_7d if e["timestamp"].hour >= 20 or e["timestamp"].hour < 6)
        off_hours_ratio = off_hours / len(prior_7d) if prior_7d else 0.0
        distinct_types_7d = len({e.get("admin_action_type") for e in prior_7d if e.get("admin_action_type")})

        cohort_rows[cohort].append(np.array([
            min(len(prior_24h), 50) / 50.0,
            min(sum(1 for e in prior_24h if e.get("admin_action_type") == "balance_override"), 20) / 20.0,
            min(sum(1 for e in prior_24h if e.get("admin_action_type") == "kyc_override"), 20) / 20.0,
            min(sum(1 for e in prior_24h if e.get("admin_action_type") == "mass_export"), 20) / 20.0,
            off_hours_ratio,
            min(distinct_types_7d, 3) / 3.0,
        ], dtype=np.float32))
        cohort_event_ids[cohort].append(event["event_id"])

        history[user_id].append({"timestamp": ts, **{k: v for k, v in event.items() if k != "timestamp"}})

    return {c: np.vstack(rows) for c, rows in cohort_rows.items()}, cohort_event_ids


class CohortIsolationForestDetector(BaseDetector):
    name = "insider_misuse"
    MIN_COHORT_SIZE = 10  # below this, fall back to the global pooled model — too little data for a stable cohort baseline

    def __init__(self):
        self.rule_engine = InsiderMisuseRuleEngine()
        self._cohort_models: dict[str, IsolationForest] = {}
        self._global_model: IsolationForest | None = None
        self._history: dict[str, list[dict]] = defaultdict(list)

    def fit(self, events: list[dict]) -> "CohortIsolationForestDetector":
        cohort_features, _ = build_cohort_features(events)
        if not cohort_features:
            print("[insider_misuse] no admin_action events found — cohort model left untrained (rules still active).")
            return self

        all_X = np.vstack(list(cohort_features.values()))
        self._global_model = IsolationForest(n_estimators=150, random_state=42, contamination="auto").fit(all_X)

        for cohort, X in cohort_features.items():
            if len(X) >= self.MIN_COHORT_SIZE:
                self._cohort_models[cohort] = IsolationForest(
                    n_estimators=150, random_state=42, contamination="auto"
                ).fit(X)
            else:
                print(
                    f"[insider_misuse] cohort '{cohort}' has only {len(X)} samples "
                    f"(<{self.MIN_COHORT_SIZE}) — will use the global model at inference."
                )
        return self

    def _model_for(self, cohort: str) -> IsolationForest | None:
        return self._cohort_models.get(cohort, self._global_model)

    def score_event(self, event: dict, context: dict | None = None) -> DetectorScore:
        rule_violations = self.rule_engine.evaluate(event)

        if event.get("event_type") != "admin_action":
            return DetectorScore(score=0.0, confidence=1.0, reason_codes=[])

        cohort = _cohort_of(event)
        model = self._model_for(cohort)

        stat_score, stat_reason = 0.0, []
        if model is not None:
            x = self._features_for_scoring(event)
            raw = model.score_samples(x.reshape(1, -1))[0]  # higher = more normal
            # fixed-scale squashing rather than a held-out calibration set —
            # cohorts can be too small to calibrate against reliably, so this
            # trades a bit of precision for robustness at small cohort sizes
            stat_score = float(np.clip(0.5 - raw, 0.0, 1.0))
            if stat_score > 0.6:
                stat_reason = ["anomalous_vs_peer_cohort"]

        rule_score, rule_reason = 0.0, []
        if rule_violations:
            severity_map = {"low": 0.4, "medium": 0.6, "high": 0.8, "critical": 0.95}
            rule_score = max(severity_map.get(v.severity, 0.5) for v in rule_violations)
            rule_reason = [v.rule_name for v in rule_violations]

        # rules are deterministic escalations and must never be diluted by
        # the statistical model, so combine via max, not average
        final_score = max(stat_score, rule_score)
        reason_codes = rule_reason + [c for c in stat_reason if c not in rule_reason]

        self._history[event["user_id"]].append(event)
        return DetectorScore(score=round(final_score, 3), confidence=0.9, reason_codes=reason_codes)

    def _features_for_scoring(self, event: dict) -> np.ndarray:
        user_id = event["user_id"]
        ts = datetime.fromisoformat(event["timestamp"])
        prior = self._history[user_id]
        prior_24h = [e for e in prior if datetime.fromisoformat(e["timestamp"]) >= ts - timedelta(hours=24)]
        prior_7d = [e for e in prior if datetime.fromisoformat(e["timestamp"]) >= ts - timedelta(days=7)]

        off_hours = sum(
            1 for e in prior_7d
            if datetime.fromisoformat(e["timestamp"]).hour >= 20 or datetime.fromisoformat(e["timestamp"]).hour < 6
        )
        return np.array([
            min(len(prior_24h), 50) / 50.0,
            min(sum(1 for e in prior_24h if e.get("admin_action_type") == "balance_override"), 20) / 20.0,
            min(sum(1 for e in prior_24h if e.get("admin_action_type") == "kyc_override"), 20) / 20.0,
            min(sum(1 for e in prior_24h if e.get("admin_action_type") == "mass_export"), 20) / 20.0,
            off_hours / len(prior_7d) if prior_7d else 0.0,
            min(len({e.get("admin_action_type") for e in prior_7d}), 3) / 3.0,
        ], dtype=np.float32)

    def save(self, path: str) -> None:
        import joblib
        import os as _os
        _os.makedirs(path, exist_ok=True)
        joblib.dump(
            {"cohort_models": self._cohort_models, "global_model": self._global_model},
            _os.path.join(path, "cohort_models.joblib"),
        )

    @classmethod
    def load(cls, path: str) -> "CohortIsolationForestDetector":
        import joblib
        import os as _os
        det = cls()
        ckpt = joblib.load(_os.path.join(path, "cohort_models.joblib"))
        det._cohort_models = ckpt["cohort_models"]
        det._global_model = ckpt["global_model"]
        return det