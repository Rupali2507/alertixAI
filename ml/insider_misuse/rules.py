from dataclasses import dataclass
from typing import Optional
from datetime import datetime, timedelta
from collections import defaultdict

@dataclass
class RuleViolation:
    rule_name: str
    severity: str  # "low" | "medium" | "high" | "critical"
    reason: str
    event_id: str

class InsiderMisuseRuleEngine:
    """
    Deterministic escalation rules for insider misuse detection.
    Stateful: tracks recent admin actions per user to detect patterns
    (e.g. mass exports = many exports in a short window).
    """

    def __init__(
        self,
        mass_export_threshold: int = 5,
        mass_export_window_min: int = 10,
        balance_override_amount_threshold: float = 50000,
    ):
        self.mass_export_threshold = mass_export_threshold
        self.mass_export_window_min = mass_export_window_min
        self.balance_override_amount_threshold = balance_override_amount_threshold

        # user_id -> list of (timestamp, event) for admin actions, for windowed checks
        self._admin_action_history: dict[str, list[tuple[datetime, dict]]] = defaultdict(list)

    def evaluate(self, event: dict) -> list[RuleViolation]:
        """
        Evaluate a single event against all rules.
        Returns a list of violations (empty if none triggered).
        """
        violations = []

        if event.get("event_type") != "admin_action":
            return violations

        user_id = event["user_id"]
        ts = datetime.fromisoformat(event["timestamp"])
        action_type = event.get("admin_action_type")

        # track history for windowed rules
        self._admin_action_history[user_id].append((ts, event))
        self._prune_old(user_id, ts)

        if action_type == "balance_override":
            v = self._check_balance_override(event)
            if v:
                violations.append(v)

        elif action_type == "kyc_override":
            violations.append(RuleViolation(
                rule_name="kyc_field_override",
                severity="medium",
                reason="Admin overrode a KYC field directly",
                event_id=event["event_id"],
            ))

        elif action_type == "mass_export":
            v = self._check_mass_export(user_id, ts)
            if v:
                violations.append(v)

        return violations

    def _check_balance_override(self, event: dict) -> Optional[RuleViolation]:
        # In real data this would reference an amount field on the override event.
        # Placeholder: flag every override as medium, escalate if amount field present and large.
        amount = event.get("txn_amount")  # reuse field if override includes an amount
        if amount and amount >= self.balance_override_amount_threshold:
            return RuleViolation(
                rule_name="large_balance_override",
                severity="critical",
                reason=f"Balance override of {amount} exceeds threshold {self.balance_override_amount_threshold}",
                event_id=event["event_id"],
            )
        return RuleViolation(
            rule_name="balance_override",
            severity="high",
            reason="Admin performed a balance override",
            event_id=event["event_id"],
        )

    def _check_mass_export(self, user_id: str, now: datetime) -> Optional[RuleViolation]:
        recent_exports = [
            e for (t, e) in self._admin_action_history[user_id]
            if e.get("admin_action_type") == "mass_export"
        ]
        if len(recent_exports) >= self.mass_export_threshold:
            return RuleViolation(
                rule_name="mass_export_pattern",
                severity="critical",
                reason=(
                    f"{len(recent_exports)} export actions by {user_id} "
                    f"within {self.mass_export_window_min} minutes"
                ),
                event_id=recent_exports[-1]["event_id"],
            )
        return None

    def _prune_old(self, user_id: str, now: datetime):
        cutoff = now - timedelta(minutes=self.mass_export_window_min)
        self._admin_action_history[user_id] = [
            (t, e) for (t, e) in self._admin_action_history[user_id] if t >= cutoff
        ]