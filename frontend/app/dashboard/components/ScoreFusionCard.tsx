// app/dashboard/components/ScoreFusionCard.tsx
"use client";

import { Brain, Laptop2, IdCard } from "lucide-react";
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
    <div className="rounded-xl border border-border bg-panel p-5">
      <h2 className="text-base font-semibold text-ink mb-4">Score Fusion Breakdown</h2>

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
