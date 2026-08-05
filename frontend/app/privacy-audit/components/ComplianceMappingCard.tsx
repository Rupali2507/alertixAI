// app/privacy-audit/components/ComplianceMappingCard.tsx
"use client";

import { Download } from "lucide-react";
import { ComplianceItem } from "@/lib/mockData";

interface ComplianceMappingCardProps {
  items: ComplianceItem[];
}

export default function ComplianceMappingCard({ items }: ComplianceMappingCardProps) {
  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <h2 className="text-base font-semibold text-ink mb-4">Compliance Mapping</h2>

      <div className="space-y-3">
        {items.map((item) => {
          const compliant = item.status === "Compliant";
          return (
            <div key={item.name} className="rounded-lg border border-border bg-panel-2 p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-ink">{item.name}</span>
                <span
                  className={`flex items-center gap-1.5 text-xs font-medium ${
                    compliant ? "text-success" : "text-faint"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      compliant ? "bg-success" : "bg-faint"
                    }`}
                  />
                  {item.status}
                </span>
              </div>
              <div className="h-1 rounded-full bg-void overflow-hidden mb-2">
                <div
                  className={`h-full ${compliant ? "bg-success" : "bg-brand"}`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <p className="text-xs text-mist">{item.description}</p>
            </div>
          );
        })}
      </div>

      <button className="w-full mt-4 flex items-center justify-center gap-1.5 rounded-md border border-border bg-panel-2 text-sm text-mist hover:text-ink py-2">
        <Download size={14} />
        Export Trust Framework
      </button>
    </div>
  );
}
