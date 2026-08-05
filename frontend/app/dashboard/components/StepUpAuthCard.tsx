// app/dashboard/components/StepUpAuthCard.tsx
"use client";

import { StepUpAuthStats } from "@/lib/mockData";

import { Info } from "lucide-react";

interface StepUpAuthCardProps {
  stats: StepUpAuthStats;
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full bg-panel-2 overflow-hidden mt-2 relative">
      <div className={`absolute top-0 left-0 h-full ${color} transition-all duration-1000 ease-out`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function StepUpAuthCard({ stats }: StepUpAuthCardProps) {
  return (
    <div className="rounded-xl border border-border bg-panel p-5 hover:border-brand/30 transition-colors shadow-sm">
      <div className="flex items-center gap-2 mb-4 group relative">
        <h2 className="text-base font-semibold text-ink">Step-up Auth Status</h2>
        <div className="relative flex items-center">
          <Info size={14} className="text-mist hover:text-ink cursor-help peer" />
          <div className="absolute left-6 w-48 p-2 bg-panel-2 border border-border rounded text-xs text-mist opacity-0 peer-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
            Events that were suspicious but not explicitly malicious, so the user was challenged for an OTP or Biometric.
          </div>
        </div>
      </div>

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
