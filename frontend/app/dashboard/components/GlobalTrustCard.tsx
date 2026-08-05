// app/dashboard/components/GlobalTrustCard.tsx
"use client";

import { AtSign } from "lucide-react";
import { TrustLevelStats } from "@/lib/mockData";

interface GlobalTrustCardProps {
  stats: TrustLevelStats;
}

export default function GlobalTrustCard({ stats }: GlobalTrustCardProps) {
  return (
    <div className="rounded-xl border border-border bg-panel p-5 flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-base font-semibold text-ink">Global Trust Level</h2>
        <AtSign size={16} className="text-faint" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <span className="text-6xl font-bold font-mono text-brand tabular-nums">
          {stats.score}
        </span>
        <span className="text-xs text-mist tracking-widest mt-1">{stats.status}</span>
      </div>

      <div className="flex justify-between border-t border-border pt-3 mt-4 text-xs">
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
        <div>
          <p className="text-faint uppercase tracking-wide">Active Sessions</p>
          <p className="font-mono mt-0.5 text-ink">
            {stats.activeSessions.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
