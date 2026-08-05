"""
SHAP-based reason-code generation for the KYC fraud model.

Produces per-event, per-feature attributions so the dashboard
(frontend/app/dashboard/components/SHAPReasonCodes.tsx) can show WHY a KYC
event scored the way it did — required for RBI/DPDP-style explainability
expectations (see docs/compliance_mapping.md), not just a UX nicety.

Falls back to a single-row permutation-importance approximation if `shap`
isn't installed, so reason codes stay available in a minimal environment
(TreeExplainer supports both the CatBoost and sklearn-GBDT backends, so
this fallback is really only a future-proofing measure against a
non-tree model swap later).
"""

from __future__ import annotations
import numpy as np

try:
    import shap
    _HAS_SHAP = True
except ImportError:
    _HAS_SHAP = False

from ml.kyc_fraud.feature_engineering import FEATURE_NAMES

HUMAN_READABLE = {
    "kyc_field_change_count_7d": "multiple_kyc_edits_recent",
    "distinct_kyc_fields_changed_7d": "multiple_kyc_fields_changed",
    "kyc_change_velocity": "rapid_kyc_edit_pattern",
    "shared_pan_hash_user_count": "pan_reused_across_accounts",
    "shared_phone_hash_user_count": "phone_reused_across_accounts",
    "shared_address_hash_user_count": "address_reused_across_accounts",
    "shared_device_user_count": "device_reused_across_accounts",
    "is_pan_number_field": "pan_number_edited",
    "is_address_field": "address_edited",
    "is_phone_field": "phone_edited",
    "is_email_field": "email_edited",
    "onboarding_to_transaction_gap_hours": "rapid_kyc_to_transaction",
    "hours_since_account_creation": "new_account",
}


class KYCShapExplainer:
    def __init__(self, model):
        """model: the underlying fitted CatBoost/sklearn estimator (KYCFraudModel.model)."""
        self.model = model
        self._explainer = shap.TreeExplainer(model) if _HAS_SHAP else None

    def top_reason_codes(self, x_row: np.ndarray, top_k: int = 3, min_abs_contribution: float = 0.01) -> list[str]:
        values = self._attribute(x_row)
        ranked = sorted(zip(FEATURE_NAMES, values), key=lambda kv: abs(kv[1]), reverse=True)
        # only *positive* (risk-increasing) contributions surface as reason codes
        return [HUMAN_READABLE.get(name, name) for name, val in ranked if val > min_abs_contribution][:top_k]

    def full_attribution(self, x_row: np.ndarray) -> dict[str, float]:
        """Every feature's signed SHAP contribution — used by the dashboard's waterfall chart."""
        values = self._attribute(x_row)
        return dict(zip(FEATURE_NAMES, [float(v) for v in values]))

    def _attribute(self, x_row: np.ndarray) -> np.ndarray:
        if self._explainer is not None:
            shap_values = self._explainer.shap_values(x_row.reshape(1, -1))
            return shap_values[0] if not isinstance(shap_values, list) else shap_values[1][0]
        return self._permutation_fallback(x_row)

    def _permutation_fallback(self, x_row: np.ndarray) -> np.ndarray:
        """
        Single-row permutation-importance approximation: zero out each
        feature one at a time and measure the drop in predicted probability.
        Coarser than SHAP but keeps reason codes available if shap isn't installed.
        """
        base = self.model.predict_proba(x_row.reshape(1, -1))[0, 1]
        contributions = np.zeros(len(FEATURE_NAMES))
        for i in range(len(FEATURE_NAMES)):
            perturbed = x_row.copy()
            perturbed[i] = 0.0
            perturbed_pred = self.model.predict_proba(perturbed.reshape(1, -1))[0, 1]
            contributions[i] = base - perturbed_pred
        return contributions