// app/insider-misuse/components/SlidingWindowChart.tsx
"use client";

import { SlidingWindowPoint } from "@/lib/mockData";

interface SlidingWindowChartProps {
  points: SlidingWindowPoint[];
  windowLabel?: string;
}

export default function SlidingWindowChart({
  points,
  windowLabel = "TUMBLE_WINDOW: 15m",
}: SlidingWindowChartProps) {
  const currentIdx = points.findIndex((p) => p.isCurrentWindow);

  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-ink">Sliding Window Detection Engine</h2>
        <span className="text-xs font-mono text-mist rounded-md border border-border bg-panel-2 px-2.5 py-1">
          {windowLabel}
        </span>
      </div>

      <div className="relative flex items-end gap-3 h-52 bg-void rounded-lg border border-border px-4 pt-8 pb-3">
        {points.map((p) => (
          <div key={p.index} className="flex-1 flex flex-col items-center justify-end h-full relative">
            {p.isAnomaly && (
              <span className="absolute -top-6 text-[10px] font-mono text-danger">ANOMALY</span>
            )}
            {p.isCurrentWindow && (
              <span className="absolute -top-6 text-[10px] font-mono text-brand whitespace-nowrap">
                CURRENT_WINDOW
              </span>
            )}
            <div
              className={`w-full rounded-t-sm ${
                p.isAnomaly || p.isCurrentWindow ? "bg-danger/50" : "bg-panel-2"
              }`}
              style={{ height: `${p.value}%` }}
            />
          </div>
        ))}

        {currentIdx >= 0 && (
          <div
            className="absolute top-3 bottom-3 border-x border-dashed border-brand/60 pointer-events-none"
            style={{
              left: `calc(${(currentIdx / points.length) * 100}% + 8px)`,
              width: `calc(${100 / points.length}% - 16px)`,
            }}
          />
        )}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <div className="flex-1 h-1 rounded-full bg-panel-2 relative">
          <div className="absolute h-2.5 w-2.5 rounded-full bg-brand -top-1" style={{ left: "92%" }} />
        </div>
      </div>
    </div>
  );
}
