from pydantic import BaseModel
from typing import Optional

class DetectorScore(BaseModel):
    """
    Standard output shape every detector must return.
    THIS IS A MOCK INTERFACE — replace with Muskan's frozen spec when ready.
    Score range: [0, 1], higher = riskier.
    """
    score: float
    confidence: float = 1.0
    reason_codes: list[str] = []

class FusedScore(BaseModel):
    fused_score: float
    sub_scores: dict[str, DetectorScore]
    decision: str  # "allow" | "step_up" | "block"
    reason_codes: list[str]