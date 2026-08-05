# AlertixAI — Demo Scenarios

Four scripted scenarios that demonstrate the full decision spectrum.
Each scenario maps to a specific event payload the presenter should
send through the `/score` endpoint (or trigger via the dashboard).

---

## Scenario 1 — Silent Allow

**Storyline:** A known user logs in from their usual device, normal hour, no anomalies anywhere.

**Expected outcome:** `decision: allow`, fused score < 0.35, no step-up, no audit flag.

**Payload to POST to `/score`:**
```json
{
  "event": {
    "event_id": "demo-allow-001",
    "event_type": "login",
    "user_id": "user_5",
    "device_id": "device_3",
    "ip_address": "10.0.1.100",
    "timestamp": "<now-ISO>",
    "login_success": true,
    "txn_amount": null,
    "txn_currency": null,
    "beneficiary_id": null,
    "kyc_field_changed": null,
    "admin_action_type": null,
    "admin_role": null
  }
}
```

**What to narrate:** "This is the 99% case — legitimate user, no friction, invisible to them."

---

## Scenario 2 — Step-up Trigger (new device + anomalous hour)

**Storyline:** A user logs in from a device never seen before, at 2 AM.
The behavioral and device-trust detectors both fire moderate scores.

**Expected outcome:** `decision: step_up`, fused score 0.35–0.70.
Dashboard shows step-up auth card; presenter clicks through the OTP flow.

**Payload:**
```json
{
  "event": {
    "event_id": "demo-stepup-001",
    "event_type": "login",
    "user_id": "user_12",
    "device_id": "device_999",
    "ip_address": "192.168.77.5",
    "timestamp": "<today-T02:17:00Z>",
    "login_success": true,
    "txn_amount": null,
    "txn_currency": null,
    "beneficiary_id": null,
    "kyc_field_changed": null,
    "admin_action_type": null,
    "admin_role": null
  }
}
```

**What to narrate:** "New device, 2 AM. Risk elevated — we ask for a second factor, not a hard block.
The user verifies with OTP and continues. This is friction-optimised, not friction-heavy."

---

## Scenario 3 — KYC Block (onboarding fraud signals)

**Storyline:** Onboarding event where PAN number and phone are reused across existing accounts,
multiple KYC edits in the last 7 days, and an immediate transaction attempt follows.

**Expected outcome:** `decision: block`, fused score ≥ 0.70.
SHAP reason codes show `pan_reused_across_accounts`, `rapid_kyc_to_txn`.

**Payload:**
```json
{
  "event": {
    "event_id": "demo-block-kyc-001",
    "event_type": "onboarding",
    "user_id": "user_71",
    "device_id": "device_119",
    "ip_address": "10.0.1.1",
    "timestamp": "<now-ISO>",
    "login_success": null,
    "txn_amount": null,
    "txn_currency": null,
    "beneficiary_id": null,
    "kyc_field_changed": "pan_number",
    "admin_action_type": null,
    "admin_role": null,
    "pan_number": "AAAPZ1234Q",
    "phone_number": "9999999999",
    "address": "456 Duplicate Rd",
    "kyc_edit_count_7d": 5,
    "time_since_last_kyc_edit_hours": 1.2,
    "rapid_kyc_to_txn": true
  }
}
```

**What to narrate:** "Same PAN appears on three accounts. Three KYC edits in 48 hours.
CatBoost + SHAP catches this pattern — we block onboarding and surface exactly which features
drove the decision so the analyst can confirm or override."

---

## Scenario 4 — Insider Misuse Alert

**Storyline:** A bank support admin performs a large balance override (₹75,000)
followed by a mass data export, all outside business hours.
Both the deterministic rule engine AND the cohort anomaly model fire.

**Expected outcome:** `decision: block`, fused score ≥ 0.70.
Reason codes: `large_balance_override`, `mass_export_pattern`, `anomalous_vs_peer_cohort`.

**Payload (balance override):**
```json
{
  "event": {
    "event_id": "demo-insider-001",
    "event_type": "admin_action",
    "user_id": "admin_7",
    "device_id": "admin_device_4",
    "ip_address": "10.1.0.55",
    "timestamp": "<today-T22:45:00Z>",
    "login_success": null,
    "txn_amount": 75000,
    "txn_currency": null,
    "beneficiary_id": null,
    "kyc_field_changed": null,
    "admin_action_type": "balance_override",
    "admin_role": "support"
  }
}
```

**What to narrate:** "Support admins don't normally do ₹75K balance overrides at 10 PM.
The rule engine catches it immediately. The cohort model flags it independently:
this admin is a 4σ outlier vs their peer group. Two independent signals, one clear block."

---

## Demo flow order

1. **Scenario 1** (allow) — establish the baseline: "most events just pass through"
2. **Scenario 2** (step-up) — show friction-optimised verification
3. **Scenario 3** (KYC block) — show SHAP explainability in the dashboard
4. **Scenario 4** (insider alert) — finish strong on the insider-threat story

Total scripted demo time target: **5–7 minutes** with the dashboard open.
Freeze the build at least 4 hours before the deadline. Do not push code changes after the freeze.
