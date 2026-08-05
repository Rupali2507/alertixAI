// app/dashboard/components/LiveFeedTicker.tsx
"use client";

import { HighRiskEvent } from "@/lib/mockData";

interface LiveFeedTickerProps {
  events: HighRiskEvent[];
}

const DECISION_LABEL: Record<HighRiskEvent["decision"], string> = {
  block: "BLOCK",
  step_up: "STEP-UP",
  allow: "ALLOW",
};

const DECISION_COLOR: Record<HighRiskEvent["decision"], string> = {
  block: "text-danger",
  step_up: "text-brand",
  allow: "text-success",
};

export default function LiveFeedTicker({ events }: LiveFeedTickerProps) {
  return (
    <div className="flex items-center gap-2 border-b border-border bg-panel px-6 py-2 overflow-x-auto whitespace-nowrap">
      <span className="text-xs font-semibold text-mist tracking-wider shrink-0">
        LIVE FEED
      </span>
      {events.slice(0, 8).map((e) => (
        <span key={e.id} className="flex items-center gap-1.5 text-xs font-mono shrink-0">
          <span className="text-faint">|</span>
          <span className={DECISION_COLOR[e.decision]}>
            [{DECISION_LABEL[e.decision]}]
          </span>
          <span className="text-mist">
            HMAC:{e.hmac} — {e.reasonLabel}
          </span>
        </span>
      ))}
    </div>
  );
}
