// app/dashboard/components/AnomalousOriginsCard.tsx
"use client";

import { ShieldAlert, Info, CheckCircle2 } from "lucide-react";

export interface FlaggedOrigin {
  hashId: string;
  reasonCode: string;
  timestamp: string;
}

interface AnomalousOriginsCardProps {
  origin: FlaggedOrigin | null;
}

const REASON_LABEL: Record<string, string> = {
  device_shared_across_many_users: "Device linked to an unusually large number of accounts",
  ip_shared_across_many_users: "IP address linked to an unusually large number of accounts",
};

export default function AnomalousOriginsCard({ origin }: AnomalousOriginsCardProps) {
  return (
    <div className="rounded-xl border border-border bg-panel-2 p-5 relative min-h-[260px] flex flex-col hover:border-brand/30 transition-colors shadow-sm">
      <div className="flex items-center gap-2 mb-4 group relative">
        <h2 className="text-base font-semibold text-ink">Anomalous Access Origins</h2>
        <div className="relative flex items-center">
          <Info size={14} className="text-mist hover:text-ink cursor-help peer" />
          <div className="absolute left-6 w-56 p-2 bg-panel border border-border rounded text-xs text-mist opacity-0 peer-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
            Most recent event flagged by the device-trust GNN&apos;s fan-out guardrail (device or IP shared across an unusually large number of accounts).
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        {origin ? (
          <ShieldAlert size={40} className="text-danger/60" />
        ) : (
          <CheckCircle2 size={40} className="text-success/50" />
        )}
      </div>

      <div
        className={`absolute bottom-5 left-5 right-5 rounded-lg border px-4 py-3 ${
          origin ? "border-danger/30 bg-panel" : "border-success/20 bg-panel text-center"
        }`}
      >
        {origin ? (
          <>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-danger mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-danger" />
              FAN-OUT SIGNATURE DETECTED
            </p>
            <p className="text-sm text-ink font-medium font-mono">{origin.hashId}</p>
            <p className="text-xs text-mist mt-1">
              {REASON_LABEL[origin.reasonCode] ?? origin.reasonCode.replace(/_/g, " ")}
            </p>
          </>
        ) : (
          <p className="text-sm text-mist">No device/IP fan-out flags in the current window.</p>
        )}
      </div>
    </div>
  );
}