// app/system-health/components/FeatureStoreCard.tsx
"use client";

import { Database } from "lucide-react";
import { FeatureStoreStats } from "@/lib/mockData";

interface FeatureStoreCardProps {
  stats: FeatureStoreStats;
}

export default function FeatureStoreCard({ stats }: FeatureStoreCardProps) {
  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink mb-4">
        <Database size={16} className="text-brand" />
        Feature Store (Parquet/S3)
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-void border border-border p-4">
          <p className="text-xs text-faint uppercase tracking-wide mb-2">Storage Usage</p>
          <p className="text-2xl font-bold font-mono text-ink">
            {stats.storageUsageTb} <span className="text-sm text-mist font-normal">TB</span>
          </p>
          <p className="text-xs text-success font-mono mt-1">+{stats.storageGrowthTb}TB (7d)</p>
        </div>
        <div className="rounded-lg bg-void border border-border p-4">
          <p className="text-xs text-faint uppercase tracking-wide mb-2">Batch Write Latency</p>
          <p className="text-2xl font-bold font-mono text-ink">
            {stats.batchWriteLatencySec} <span className="text-sm text-mist font-normal">sec</span>
          </p>
          <p className="text-xs text-faint font-mono mt-1">p99 avg</p>
        </div>
      </div>
    </div>
  );
}
