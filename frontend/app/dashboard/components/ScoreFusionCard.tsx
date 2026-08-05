// app/dashboard/components/ScoreFusionCard.tsx
"use client";

import { Brain, Laptop2, IdCard, Info } from "lucide-react";
import { SubScores } from "@/lib/mockData";

interface ScoreFusionCardProps {
  subScores: SubScores;
}

const ROWS: { key: keyof SubScores; label: string; icon: typeof Brain }[] = [
  { key: "behavioral", label: "Behavioral", icon: Brain },
  { key: "deviceTrust", label: "Device Trust", icon: Laptop2 },
  { key: "kyc", label: "KYC Fraud", icon: IdCard },
];

export default function ScoreFusionCard({ subScores }: ScoreFusionCardProps) {
  return (
    <div className="rounded-xl border border-border bg-panel p-5 hover:border-brand/30 transition-colors shadow-sm">
      <div className="flex items-center gap-2 mb-4 group relative">
        <h2 className="text-base font-semibold text-ink">Score Fusion Breakdown</h2>
        <div className="relative flex items-center">
          <Info size={14} className="text-mist hover:text-ink cursor-help peer" />
          <div className="absolute left-6 w-48 p-2 bg-panel-2 border border-border rounded text-xs text-mist opacity-0 peer-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
            How the different AI models contributed to the average risk score for recent events.
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {ROWS.map(({ key, label, icon: Icon }) => {
          const avg = subScores[key] / 100;
          return (
            <div key={key}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="flex items-center gap-2 text-mist">
                  <Icon size={14} />
                  {label}
                </span>
                <span className="font-mono text-ink">Avg {avg.toFixed(2)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-panel-2 overflow-hidden flex">
                <div className="h-full bg-success" style={{ width: `${(1 - avg) * 100}%` }} />
                <div className="h-full bg-danger" style={{ width: `${avg * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <button className="w-full mt-5 rounded-md bg-brand-dim border border-brand/40 text-brand text-sm font-medium py-2 hover:bg-brand/20">
        Adjust Weights
      </button>
    </div>
  );
}
