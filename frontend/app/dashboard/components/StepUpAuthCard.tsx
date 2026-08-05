// app/dashboard/components/StepUpAuthCard.tsx
"use client";

import { StepUpAuthStats } from "@/lib/mockData";

interface StepUpAuthCardProps {
  stats: StepUpAuthStats;
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full bg-panel-2 overflow-hidden mt-2">
      <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function StepUpAuthCard({ stats }: StepUpAuthCardProps) {
  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <h2 className="text-base font-semibold text-ink mb-4">Step-up Auth Status</h2>

      <div className="mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-mist">MFA Challenges</span>
          <span className="font-mono text-ink">{stats.mfaChallenges.toLocaleString()}</span>
        </div>
        <Bar pct={Math.min(100, (stats.mfaChallenges / 5000) * 100)} color="bg-brand" />
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-mist">FIDO2 Success Rate</span>
          <span className="font-mono text-success">{stats.fido2SuccessRate}%</span>
        </div>
        <Bar pct={stats.fido2SuccessRate} color="bg-success" />
      </div>

      <div>
        <div className="flex justify-between text-sm">
          <span className="text-mist">SMS Fallback Rate</span>
          <span className="font-mono text-danger">{stats.smsFallbackRate}%</span>
        </div>
        <Bar pct={stats.smsFallbackRate} color="bg-danger" />
      </div>
    </div>
  );
}
