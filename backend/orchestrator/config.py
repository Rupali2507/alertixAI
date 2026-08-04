from pydantic import BaseModel

class ThresholdConfig(BaseModel):
    """
    Decision thresholds. Fused score is assumed to be in range [0, 1],
    where higher = riskier.
    """
    allow_max: float = 0.35        # below this -> allow
    step_up_max: float = 0.70      # between allow_max and step_up_max -> step-up
    # anything >= step_up_max -> block

class FusionWeights(BaseModel):
    """Weights for weighted-average score fusion (placeholder until Muskan's meta-classifier)."""
    behavioral: float = 0.30
    device_trust: float = 0.25
    kyc: float = 0.25
    insider_misuse: float = 0.20

class OrchestratorConfig(BaseModel):
    thresholds: ThresholdConfig = ThresholdConfig()
    fusion_weights: FusionWeights = FusionWeights()

# Singleton config instance — in production this could load from a YAML/env file
config = OrchestratorConfig()