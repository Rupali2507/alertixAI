// app/insider-misuse/components/EscalatedAlertCard.tsx
"use client";

import { FileText, ShieldAlert } from "lucide-react";
import { EscalatedAlert } from "@/lib/mockData";

interface EscalatedAlertCardProps {
  alert: EscalatedAlert;
}

const SEVERITY_STYLES: Record<EscalatedAlert["severity"], { badge: string; border: string; icon: typeof FileText }> = {
  CRITICAL: { badge: "bg-danger-solid text-white", border: "border-l-danger", icon: FileText },
  HIGH: { badge: "bg-warning/20 text-warning", border: "border-l-warning", icon: ShieldAlert },
};

export default function EscalatedAlertCard({ alert }: EscalatedAlertCardProps) {
  const style = SEVERITY_STYLES[alert.severity];
  const Icon = style.icon;

  return (
    <div className={`rounded-xl border border-border border-l-4 ${style.border} bg-panel p-4`}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={15} className="text-mist" />
        <span className={`text-[11px] font-semibold rounded px-2 py-0.5 ${style.badge}`}>
          {alert.severity}
        </span>
        <span className="text-sm font-semibold text-ink">{alert.title}</span>
        <span className="ml-auto text-xs font-mono text-faint">
          {new Date(alert.timestamp).toLocaleTimeString()} UTC
        </span>
      </div>

      <p className="text-sm text-mist mb-3">{alert.description}</p>

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-lg bg-void px-3 py-2.5 text-xs font-mono">
        {alert.details.map((d) => (
          <div key={d.label} className="flex justify-between gap-3">
            <span className="text-faint">{d.label}:</span>
            <span className="text-ink">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
