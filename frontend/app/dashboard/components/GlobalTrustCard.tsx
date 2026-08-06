// app/dashboard/components/GlobalTrustCard.tsx
"use client";

import { Info } from "lucide-react";
import { TrustLevelStats } from "@/lib/mockData";

interface GlobalTrustCardProps {
  stats: TrustLevelStats;
}

export default function GlobalTrustCard({ stats }: GlobalTrustCardProps) {
  const isHealthy = stats.score > 80;
  const isWarning = stats.score > 50 && stats.score <= 80;
  const colorClass = isHealthy ? 'text-brand' : isWarning ? 'text-warning' : 'text-danger';

  return (
    <div className="rounded-xl border border-border bg-panel p-5 flex flex-col hover:border-brand/30 transition-colors shadow-sm relative overflow-hidden">
      <div className="flex items-center justify-between mb-8 group relative z-10">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-ink uppercase tracking-wide">Global Trust Level</h2>
          <div className="relative flex items-center">
            <Info size={14} className="text-mist hover:text-ink cursor-help peer" />
            <div className="absolute left-6 w-48 p-2 bg-panel-2 border border-border rounded text-xs text-mist opacity-0 peer-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
              The overall health of the system based on the ratio of allowed vs. blocked events.
            </div>
          </div>
        </div>
        <div className={`h-2 w-2 rounded-full animate-pulse ${isHealthy ? 'bg-brand' : isWarning ? 'bg-warning' : 'bg-danger'}`}></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative py-2">
        <span className={`text-6xl font-black font-mono relative z-10 tabular-nums drop-shadow-[0_0_15px_currentColor] ${colorClass}`}>
          {stats.score}
        </span>
        <span className="text-xs text-mist tracking-widest mt-2 uppercase font-bold relative z-10">{stats.status}</span>
      </div>

      <div className="flex justify-between border-t border-border pt-4 mt-6 text-xs relative z-10">
        <div>
          <p className="text-faint uppercase tracking-wide">Baseline Deviation</p>
          <p
            className={`font-mono mt-0.5 ${
              stats.baselineDeviationPct >= 0 ? "text-success" : "text-danger"
            }`}
          >
            {stats.baselineDeviationPct >= 0 ? "+" : ""}
            {stats.baselineDeviationPct}%
          </p>
        </div>
        <div className="text-right">
          <p className="text-faint uppercase tracking-wide">Active Sessions</p>
          <p className="font-mono mt-0.5 text-ink">
            {stats.activeSessions.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
