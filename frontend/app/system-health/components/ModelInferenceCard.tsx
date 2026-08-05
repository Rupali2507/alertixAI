// app/system-health/components/ModelInferenceCard.tsx
"use client";

import { Brain } from "lucide-react";
import { ModelInferenceStat } from "@/lib/mockData";

interface ModelInferenceCardProps {
  stats: ModelInferenceStat[];
}

const BAR_COLORS = ["bg-danger", "bg-success", "bg-brand"];

export default function ModelInferenceCard({ stats }: ModelInferenceCardProps) {
  const maxLatency = Math.max(...stats.map((s) => s.latencyMs), 1);

  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink mb-4">
        <Brain size={16} className="text-brand" />
        Model Inference
      </h2>

      <div className="space-y-4">
        {stats.map((s, i) => (
          <div key={s.name}>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-mist">{s.name}</span>
              <span className="font-mono text-ink">{s.latencyMs}ms</span>
            </div>
            <div className="h-1.5 rounded-full bg-panel-2 overflow-hidden">
              <div
                className={`h-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                style={{ width: `${(s.latencyMs / maxLatency) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
