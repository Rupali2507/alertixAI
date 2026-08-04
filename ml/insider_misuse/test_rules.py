import sys, os
sys.path.append(os.path.dirname(__file__))
from rules import InsiderMisuseRuleEngine
import uuid
from datetime import datetime, timezone

engine = InsiderMisuseRuleEngine(mass_export_threshold=3, mass_export_window_min=10)

# simulate a single balance override
event1 = {
    "event_id": str(uuid.uuid4()),
    "event_type": "admin_action",
    "admin_action_type": "balance_override",
    "user_id": "user_admin_1",
    "timestamp": datetime.now(timezone.utc).isoformat(),
}
print(engine.evaluate(event1))

# simulate mass export pattern (4 exports, threshold=3)
for i in range(4):
    event = {
        "event_id": str(uuid.uuid4()),
        "event_type": "admin_action",
        "admin_action_type": "mass_export",
        "user_id": "user_admin_2",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    result = engine.evaluate(event)
    if result:
        print(f"Export #{i+1}:", result)