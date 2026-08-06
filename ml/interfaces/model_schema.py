from pydantic import BaseModel
from typing import Optional

class DetectorScore(BaseModel):
    """
    Standard output shape every detector must return.
    Score range: [0, 1], higher = riskier.
    """
    score: float
    confidence: float = 1.0
    reason_codes: list[str] = []
    reason_code_weights: dict[str, float] = {}  # optional: code -> signed magnitude, e.g. SHAP value. Empty = unavailable.

class FusedScore(BaseModel):
    fused_score: float
    sub_scores: dict[str, DetectorScore]
    decision: str  # "allow" | "step_up" | "block"
    reason_codes: list[str]
    reason_code_details: list[dict] = []  # [{code, description, detector, contribution}], contribution may be None