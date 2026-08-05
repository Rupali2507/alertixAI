// app/dashboard/components/ScoreCard.tsx
"use client";

import { Decision } from "@/lib/mockData";

interface ScoreCardProps {
  fusedScore: number;
  decision: Decision;
  userId: string;
  timestamp: string;
  onClick?: () => void;
  selected?: boolean;
}

const DECISION_STYLES: Record<
  Decision,
  { label: string; text: string; dot: string; bar: string }
> = {
  allow: {
    label: "Allow",
    text: "text-risk-low",
    dot: "bg-risk-low",
    bar: "bg-risk-low",
  },
  step_up: {
    label: "Step-up",
    text: "text-risk-mid",
    dot: "bg-risk-mid",
    bar: "bg-risk-mid",
  },
  block: {
    label: "Block",
    text: "text-risk-high",
    dot: "bg-risk-high",
    bar: "bg-risk-high",
  },
};

export default function ScoreCard({
  fusedScore,
  decision,
  userId,
  timestamp,
  onClick,
  selected,
}: ScoreCardProps) {
  const style = DECISION_STYLES[decision];
  const time = new Date(timestamp).toLocaleTimeString();

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-3 transition-colors ${
        selected
          ? "border-signal bg-panel-2"
          : "border-border bg-panel hover:bg-panel-2"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-ink font-mono">{userId}</span>
        <span className={`flex items-center gap-1.5 text-xs ${style.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-panel-2 overflow-hidden">
          <div className={`h-full ${style.bar}`} style={{ width: `${fusedScore}%` }} />
        </div>
        <span className="text-sm font-semibold text-ink font-mono tabular-nums">
          {fusedScore}
        </span>
      </div>

      <div className="mt-1 text-xs text-faint font-mono">{time}</div>
    </button>
  );
}
