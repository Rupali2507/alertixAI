// app/dashboard/components/HighRiskEventsTable.tsx
"use client";

import Link from "next/link";
import { Info } from "lucide-react";
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
        <div className="flex items-center gap-2 group relative">
          <h2 className="text-base font-semibold text-ink">Live Event Stream</h2>
          <div className="relative flex items-center">
            <Info size={14} className="text-mist hover:text-ink cursor-help peer" />
            <div className="absolute left-6 w-56 p-2 bg-panel-2 border border-border rounded text-xs text-mist opacity-0 peer-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
              A real-time feed of events processed by the Decision Engine. Click any row for a detailed AI rationale.
            </div>
          </div>
        </div>
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
              <td className="py-3 font-mono">
                {e.score < 0.5 ? (
                  <span className="text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded text-xs">{(e.score * 100).toFixed(0)} - LOW</span>
                ) : e.score < 0.75 ? (
                  <span className="text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded text-xs">{(e.score * 100).toFixed(0)} - ELEVATED</span>
                ) : (
                  <span className="text-danger bg-danger/10 border border-danger/20 px-2 py-0.5 rounded text-xs">{(e.score * 100).toFixed(0)} - CRITICAL</span>
                )}
              </td>
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
