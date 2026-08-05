// app/system-health/components/FastApiCard.tsx
"use client";

import { Zap } from "lucide-react";
import { FastApiStatus } from "@/lib/mockData";

interface FastApiCardProps {
  status: FastApiStatus;
}

export default function FastApiCard({ status }: FastApiCardProps) {
  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-danger/10 flex items-center justify-center">
            <Zap size={16} className="text-danger" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink">FastAPI Routers</h2>
            <p className="text-xs text-mist font-mono">Port: {status.port}</p>
          </div>
        </div>
        <span className="h-2.5 w-2.5 rounded-full bg-success" />
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-mist">Avg Response Time</span>
          <span className="font-mono text-success">{status.avgResponseMs}ms</span>
        </div>
        <div className="flex justify-between">
          <span className="text-mist">Error Rate (5xx)</span>
          <span className="font-mono text-success">{status.errorRatePct}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-mist">Active Connections</span>
          <span className="font-mono text-ink">{status.activeConnections.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
