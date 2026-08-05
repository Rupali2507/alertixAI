// app/dashboard/components/HighRiskEventsTable.tsx
"use client";

import Link from "next/link";
import { HighRiskEvent } from "@/lib/mockData";

interface HighRiskEventsTableProps {
  events: HighRiskEvent[];
  onRowClick?: (event: HighRiskEvent) => void;
}

const ACTION_LABEL: Record<HighRiskEvent["decision"], string> = {
  block: "BLOCK",
  step_up: "STEP-UP",
  allow: "ALLOW",
};

function ActionBadge({ decision }: { decision: HighRiskEvent["decision"] }) {
  if (decision === "block") {
    return (
      <span className="rounded px-2.5 py-1 text-xs font-semibold bg-danger-solid text-white">
        BLOCK
      </span>
    );
  }
  if (decision === "step_up") {
    return (
      <Link
        href="/stepup"
        onClick={(e) => e.stopPropagation()}
        className="rounded px-2.5 py-1 text-xs font-semibold bg-brand text-white hover:bg-brand/90"
      >
        STEP-UP
      </Link>
    );
  }
  return <span className="text-xs font-semibold text-success">ALLOW</span>;
}

function LeftBar({ decision }: { decision: HighRiskEvent["decision"] }) {
  const color =
    decision === "block" ? "bg-danger" : decision === "step_up" ? "bg-warning" : "bg-success";
  return <span className={`absolute left-0 top-0 h-full w-1 ${color}`} />;
}

function SignalFusionBars({ values }: { values: [number, number, number] }) {
  return (
    <div className="flex gap-1">
      {values.map((v, i) => (
        <span
          key={i}
          className="w-2 h-4 rounded-sm"
          style={{ backgroundColor: v > 0.55 ? "#f87171" : "#4ade80" }}
        />
      ))}
    </div>
  );
}

export default function HighRiskEventsTable({ events, onRowClick }: HighRiskEventsTableProps) {
  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-ink">High-Risk Events</h2>
        <button className="text-xs rounded-md border border-border bg-panel-2 px-3 py-1.5 text-mist hover:text-ink">
          View Full Log
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-faint uppercase tracking-wide text-left">
            <th className="pb-2 font-medium pl-3">Event Hash (HMAC)</th>
            <th className="pb-2 font-medium">Score</th>
            <th className="pb-2 font-medium">Signal Fusion</th>
            <th className="pb-2 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <tr
              key={e.id}
              onClick={() => onRowClick?.(e)}
              className="border-t border-border cursor-pointer hover:bg-panel-2 transition-colors"
            >
              <td className="relative py-3 pl-3 font-mono text-ink">
                <LeftBar decision={e.decision} />
                {e.hmac}
              </td>
              <td className="py-3 font-mono text-mist">{e.score.toFixed(2)}</td>
              <td className="py-3">
                <SignalFusionBars values={e.signalFusion} />
              </td>
              <td className="py-3 text-right">
                <ActionBadge decision={e.decision} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
