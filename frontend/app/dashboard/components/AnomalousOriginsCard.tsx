// app/dashboard/components/AnomalousOriginsCard.tsx
"use client";

import { Image as ImageIcon, Info } from "lucide-react";
import { AnomalyCluster } from "@/lib/mockData";

interface AnomalousOriginsCardProps {
  cluster: AnomalyCluster;
}

export default function AnomalousOriginsCard({ cluster }: AnomalousOriginsCardProps) {
  return (
    <div className="rounded-xl border border-border bg-panel-2 p-5 relative min-h-[260px] flex flex-col hover:border-brand/30 transition-colors shadow-sm">
      <div className="flex items-center gap-2 mb-4 group relative">
        <h2 className="text-base font-semibold text-ink">Anomalous Access Origins</h2>
        <div className="relative flex items-center">
          <Info size={14} className="text-mist hover:text-ink cursor-help peer" />
          <div className="absolute left-6 w-48 p-2 bg-panel border border-border rounded text-xs text-mist opacity-0 peer-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
            Geographic hotspots of blocked or suspicious access attempts within the last 24 hours.
          </div>
        </div>
      </div>

      {/* Map placeholder — swap for a real geo/world map component in a later phase */}
      <div className="flex-1 flex items-center justify-center">
        <ImageIcon size={40} className="text-brand/50" />
      </div>

      <div className="absolute bottom-5 right-5 max-w-[220px] rounded-lg border border-danger/30 bg-panel px-4 py-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-danger mb-1">
          <span className="h-1.5 w-1.5 rounded-full bg-danger" />
          CLUSTER DETECTED
        </p>
        <p className="text-sm text-ink font-medium">Region: {cluster.region}</p>
        <p className="text-xs text-mist mt-1">{cluster.description}</p>
      </div>
    </div>
  );
}
