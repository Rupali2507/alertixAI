// app/system-health/components/ContainerStatusTable.tsx
"use client";

import { Boxes } from "lucide-react";
import { ContainerStatusRow } from "@/lib/mockData";

interface ContainerStatusTableProps {
  rows: ContainerStatusRow[];
}

const STATUS_STYLE: Record<ContainerStatusRow["status"], string> = {
  "Up 4 days": "bg-success/10 text-success border-success/30",
  "Up 12 hours": "bg-success/10 text-success border-success/30",
  Restarting: "bg-danger/10 text-danger border-danger/30",
};

export default function ContainerStatusTable({ rows }: ContainerStatusTableProps) {
  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink mb-4">
        <Boxes size={16} className="text-brand" />
        Container Status
      </h2>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-faint uppercase tracking-wide text-left">
            <th className="pb-2 font-medium">Container ID</th>
            <th className="pb-2 font-medium">Image</th>
            <th className="pb-2 font-medium">Status</th>
            <th className="pb-2 font-medium">CPU %</th>
            <th className="pb-2 font-medium">Mem Usage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="py-3 font-mono text-ink">{r.id}</td>
              <td className="py-3 font-mono text-mist">{r.image}</td>
              <td className="py-3">
                <span
                  className={`text-xs font-medium rounded-full border px-2.5 py-0.5 ${STATUS_STYLE[r.status]}`}
                >
                  {r.status}
                </span>
              </td>
              <td className="py-3 font-mono text-mist">{r.cpuPct}%</td>
              <td className="py-3 font-mono text-mist">
                {r.memUsedGb}GB / {r.memTotalGb}GB
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
