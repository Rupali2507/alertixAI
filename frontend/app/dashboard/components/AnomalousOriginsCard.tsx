// app/dashboard/components/AnomalousOriginsCard.tsx
"use client";

import { Image as ImageIcon } from "lucide-react";
import { AnomalyCluster } from "@/lib/mockData";

interface AnomalousOriginsCardProps {
  cluster: AnomalyCluster;
}

export default function AnomalousOriginsCard({ cluster }: AnomalousOriginsCardProps) {
  return (
    <div className="rounded-xl border border-border bg-panel-2 p-5 relative min-h-[260px] flex flex-col">
      <h2 className="text-base font-semibold text-ink mb-4">Anomalous Access Origins</h2>

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
