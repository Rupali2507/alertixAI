// app/insider-misuse/components/AdminActionsTable.tsx
"use client";

import { Filter } from "lucide-react";
import { AdminAction } from "@/lib/mockData";

interface AdminActionsTableProps {
  actions: AdminAction[];
}

const STATUS_COLOR: Record<AdminAction["status"], string> = {
  SUCCESS: "text-success",
  ALERTED: "text-danger",
  FLAGGED: "text-warning",
};

export default function AdminActionsTable({ actions }: AdminActionsTableProps) {
  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-ink">Internal Admin Actions</h2>
        <button className="flex items-center gap-1.5 text-xs text-mist hover:text-ink">
          <Filter size={13} />
          Filter
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-faint uppercase tracking-wide text-left">
            <th className="pb-2 font-medium">Timestamp</th>
            <th className="pb-2 font-medium">Hash ID</th>
            <th className="pb-2 font-medium">Action Type</th>
            <th className="pb-2 font-medium">Target</th>
            <th className="pb-2 font-medium text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((a, i) => (
            <tr key={i} className="border-t border-border">
              <td className="py-2.5 font-mono text-mist">{a.timestamp}</td>
              <td className="py-2.5 font-mono text-brand">{a.hashId}</td>
              <td className="py-2.5 font-mono text-ink">{a.actionType}</td>
              <td className="py-2.5 font-mono text-mist">{a.target}</td>
              <td className={`py-2.5 text-right font-mono text-xs ${STATUS_COLOR[a.status]}`}>
                ● {a.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
