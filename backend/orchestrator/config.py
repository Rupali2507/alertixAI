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

class LoginThresholdConfig(BaseModel):
    """
    Separate, slightly stricter thresholds for login events — an account
    takeover in progress is higher-stakes than a single flagged
    transaction, so we step up / block earlier.
    """
    allow_max: float = 0.30
    step_up_max: float = 0.65
    # anything >= step_up_max -> block (deny with explanation)

class LoginFusionWeights(BaseModel):
    """
    Fusion weights for login events. Only behavioral, device_trust, and
    login_trust apply here — kyc and insider_misuse are transaction/
    admin-action detectors and are excluded rather than given a zero
    weight, so a cold-started login_trust detector isn't silently diluted
    by two irrelevant sub-scores.
    """
    behavioral: float = 0.35
    device_trust: float = 0.30
    login_trust: float = 0.35

class OrchestratorConfig(BaseModel):
    thresholds: ThresholdConfig = ThresholdConfig()
    fusion_weights: FusionWeights = FusionWeights()
    login_thresholds: LoginThresholdConfig = LoginThresholdConfig()
    login_fusion_weights: LoginFusionWeights = LoginFusionWeights()

# Singleton config instance — in production this could load from a YAML/env file
config = OrchestratorConfig()
