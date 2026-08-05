"""
FROZEN INFERENCE INTERFACE — v1.0

Every detector (behavioral, device_trust, kyc, insider_misuse) implements
this exact interface. This is the handoff Rupali needs to build dashboard
components against without waiting on trained models, and the handoff
Ratnesh needs to wire real detectors into backend/routers/score.py in place
of ml/interfaces/mock_detectors.py.

Contract:
  - fit(events)        -> trains the detector on a batch of raw events
                           (list[dict] matching ingestion/schemas/event_schema.json)
                           and returns self, so `Detector().fit(events)` chains.
  - score_event(event)  -> returns a DetectorScore (score in [0, 1], higher
                           = riskier; confidence in [0, 1]; reason_codes as
                           short machine-readable strings). MUST NOT raise
                           on a well-formed event, even if the detector has
                           never seen this user/device before — return a
                           sensible low-confidence default instead. Score
                           must always be well-defined and bounded even in
                           that cold-start case, since the fusion layer
                           (ml/fusion/score_fusion.py) assumes a valid
                           [0, 1] score from every sub-model on every call.
  - save(path) / load(path) -> persist/restore trained state. `path` is a
                           directory, not a single file, since some
                           detectors (device_trust) need multiple artifacts.

Do not change this interface without a version bump and a note to Ratnesh
and Rupali — both the orchestrator and the dashboard's TypeScript types
(frontend/lib/api.ts) are written against this shape.
"""

from __future__ import annotations
from abc import ABC, abstractmethod

from ml.interfaces.model_schema import DetectorScore


class BaseDetector(ABC):
    name: str  # must match the sub_scores key used everywhere downstream
    # ("behavioral" | "device_trust" | "kyc" | "insider_misuse")

    @abstractmethod
    def fit(self, events: list[dict]) -> "BaseDetector":
        """Train (or retrain) on a batch of raw events. Returns self."""
        raise NotImplementedError

    @abstractmethod
    def score_event(self, event: dict, context: dict | None = None) -> DetectorScore:
        """
        Score a single event. `context` is an optional dict for cross-detector
        signal passing later (e.g. insider_misuse's rule violations could be
        surfaced to fusion via context rather than only via reason_codes) —
        reserved, unused by v1.0 detectors.
        """
        raise NotImplementedError

    @abstractmethod
    def save(self, path: str) -> None:
        raise NotImplementedError

    @classmethod
    @abstractmethod
    def load(cls, path: str) -> "BaseDetector":
        raise NotImplementedError