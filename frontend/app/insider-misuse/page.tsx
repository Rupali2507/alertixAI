// app/insider-misuse/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Download, Plus } from "lucide-react";
import {
  SlidingWindowPoint,
  ThresholdControls,
  EscalatedAlert,
  AdminAction,
  generateSlidingWindow,
  generateThresholdControls,
  generateEscalatedAlerts,
  generateAdminActions,
} from "@/lib/mockData";
import TopBar from "../components/TopBar";
import SlidingWindowChart from "./components/SlidingWindowChart";
import ThresholdControlsCard from "./components/ThresholdControlsCard";
import EscalatedAlertCard from "./components/EscalatedAlertCard";
import AdminActionsTable from "./components/AdminActionsTable";

export default function InsiderMisusePage() {
  const [points, setPoints] = useState<SlidingWindowPoint[]>([]);
  const [thresholds, setThresholds] = useState<ThresholdControls | null>(null);
  const [alerts, setAlerts] = useState<EscalatedAlert[]>([]);
  const [actions, setActions] = useState<AdminAction[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPoints(generateSlidingWindow());
      setThresholds(generateThresholdControls());
      setAlerts(generateEscalatedAlerts());
      setActions(generateAdminActions());
    }, 0);
    return () => clearTimeout(t);
  }, []);

  if (!thresholds) {
    return (
      <div className="min-h-screen flex items-center justify-center text-faint text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar title="Insider Misuse Investigation" searchPlaceholder="Search entity, rule, ..." />

      <main className="p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="tracking-label text-[11px] text-brand mb-2">insider threat</p>
            <h1 className="text-2xl font-medium text-ink">Active Investigations</h1>
            <p className="text-sm text-mist font-mono mt-1">
              Filtering: INTERNAL_THREAT_V2 | Window: Last 24H
            </p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 rounded-lg glass-card px-3.5 py-2 text-sm text-mist hover:text-ink">
              <Download size={14} />
              Export Report
            </button>
            <button className="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm text-black font-medium hover:bg-brand/90">
              <Plus size={14} />
              New Case
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
          <SlidingWindowChart points={points} />
          <ThresholdControlsCard initial={thresholds} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4 items-start">
          <div>
            <h2 className="text-base font-semibold text-ink mb-3">Escalated Alerts</h2>
            <div className="space-y-3">
              {alerts.map((a) => (
                <EscalatedAlertCard key={a.id} alert={a} />
              ))}
            </div>
          </div>
          <AdminActionsTable actions={actions} />
        </div>
      </main>
    </div>
  );
}
