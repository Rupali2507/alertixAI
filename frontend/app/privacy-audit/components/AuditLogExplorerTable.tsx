// app/privacy-audit/components/AuditLogExplorerTable.tsx
"use client";

import { Search, ChevronDown } from "lucide-react";
import { AuditLogRow, AuditDecision } from "@/lib/mockData";

interface AuditLogExplorerTableProps {
  rows: AuditLogRow[];
}

const DECISION_COLOR: Record<AuditDecision, string> = {
  ALLOW: "text-success",
  DENY: "text-danger",
  CHALLENGE: "text-warning",
};

const BORDER_COLOR: Record<AuditDecision, string> = {
  ALLOW: "border-l-brand",
  DENY: "border-l-danger",
  CHALLENGE: "border-l-warning",
};

export default function AuditLogExplorerTable({ rows }: AuditLogExplorerTableProps) {
  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-base font-semibold text-ink">Audit Log Explorer</h2>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-md border border-border bg-panel-2 px-3 py-1.5 text-xs text-mist">
            All Decisions
            <ChevronDown size={13} />
          </button>
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-panel-2 px-3 py-1.5">
            <Search size={13} className="text-faint" />
            <input
              placeholder="Grep logs..."
              className="bg-transparent text-xs text-ink placeholder:text-faint outline-none font-mono w-24"
            />
          </div>
        </div>
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="text-faint uppercase tracking-wide text-left font-mono">
            <th className="pb-2 font-medium pl-3">Timestamp</th>
            <th className="pb-2 font-medium">Hashed Subject (HMAC)</th>
            <th className="pb-2 font-medium">Decision</th>
            <th className="pb-2 font-medium">Policy V.</th>
            <th className="pb-2 font-medium">Consent Basis / Context</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={`border-t border-border border-l-4 ${BORDER_COLOR[r.decision]}`}>
              <td className="py-2.5 pl-3 font-mono text-mist whitespace-nowrap">
                {new Date(r.timestamp).toISOString().replace("T", "T").slice(0, 19)}Z
              </td>
              <td className="py-2.5 font-mono text-ink">{r.hashedSubject}</td>
              <td className={`py-2.5 font-mono font-semibold ${DECISION_COLOR[r.decision]}`}>
                {r.decision}
              </td>
              <td className="py-2.5 font-mono text-mist">{r.policyVersion}</td>
              <td className="py-2.5 font-mono text-warning/80 truncate max-w-[260px]">
                {r.context}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-center text-xs text-faint font-mono mt-4">-- End of recent logs --</p>
    </div>
  );
}
