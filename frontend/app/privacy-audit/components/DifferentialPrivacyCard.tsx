// app/privacy-audit/components/DifferentialPrivacyCard.tsx
"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { PrivacyAnalyticsPoint } from "@/lib/mockData";

interface DifferentialPrivacyCardProps {
  points: PrivacyAnalyticsPoint[];
}

export default function DifferentialPrivacyCard({ points }: DifferentialPrivacyCardProps) {
  const [epsilon, setEpsilon] = useState(1.5);
  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <div className="flex items-start justify-between mb-5 gap-6">
        <div>
          <h2 className="text-base font-semibold text-ink">Differential Privacy Analytics</h2>
          <p className="text-sm text-mist mt-0.5">
            Laplace Mechanism applied to identity event aggregates.
          </p>
        </div>

        <div className="shrink-0 w-44">
          <div className="flex items-center justify-between text-xs text-mist mb-1">
            <span className="flex items-center gap-1">
              Noise Level (Epsilon ε) <Info size={11} />
            </span>
          </div>
          <input
            type="range"
            min={0.1}
            max={3}
            step={0.1}
            value={epsilon}
            onChange={(e) => setEpsilon(Number(e.target.value))}
            className="w-full accent-brand"
          />
          <div className="flex justify-between text-[11px] text-faint font-mono">
            <span>High Priv.</span>
            <span>ε={epsilon.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-end gap-3 h-56 bg-void rounded-lg border border-border px-4 pt-4 pb-2">
        {points.map((p) => (
          <div
            key={p.hour}
            className="flex-1 bg-panel-2 rounded-t-sm border-t-2 border-brand/50"
            style={{ height: `${(p.value / max) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs font-mono text-faint mt-2">
        <span>{points[0]?.hour} UTC</span>
        <span className="text-mist">Auth Events (Aggregated)</span>
        <span>24:00 UTC</span>
      </div>
    </div>
  );
}
