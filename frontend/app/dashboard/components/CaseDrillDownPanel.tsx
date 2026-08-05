// app/dashboard/components/CaseDrillDownPanel.tsx
"use client";

import { X } from "lucide-react";
import { CaseDetail, Decision } from "@/lib/mockData";
import SubScoreBreakdown from "./SubScoreBreakdown";
import SHAPReasonCodes from "./SHAPReasonCodes";
import DeviceGraphView from "./DeviceGraphView";

interface CaseDrillDownPanelProps {
  detail: CaseDetail | null;
  onClose: () => void;
}

const DECISION_STYLES: Record<Decision, { label: string; className: string }> = {
  allow: { label: "Allow", className: "bg-success/10 text-success border-success/30" },
  step_up: { label: "Step-up", className: "bg-brand-dim text-brand border-brand/30" },
  block: { label: "Block", className: "bg-danger-solid text-white border-transparent" },
};

export default function CaseDrillDownPanel({ detail, onClose }: CaseDrillDownPanelProps) {
  if (!detail) return null;
  const style = DECISION_STYLES[detail.decision];

  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-panel border-l border-border z-50 overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-panel">
          <div>
            <p className="text-xs text-faint font-mono">Case</p>
            <h2 className="text-base font-semibold text-ink font-mono">{detail.hmac}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold rounded-full border px-2.5 py-1 ${style.className}`}>
              {style.label}
            </span>
            <button onClick={onClose} className="text-mist hover:text-ink">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs text-faint font-mono">
              {new Date(detail.timestamp).toLocaleString()}
            </span>
            <span className="text-2xl font-bold font-mono text-ink">{detail.score}</span>
          </div>

          <SubScoreBreakdown subScores={detail.subScores} />
          <SHAPReasonCodes reasonCodes={detail.reasonCodes} />
          <DeviceGraphView graph={detail.deviceGraph} />

          <div>
            <h3 className="text-sm font-semibold text-mist mb-2 tracking-wide uppercase text-xs">
              Audit Log Entry
            </h3>
            <div className="rounded-lg bg-void border border-border p-3 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-faint">Policy Version</span>
                <span className="text-ink">{detail.audit.policyVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-faint">Consent Basis</span>
                <span className="text-ink">{detail.audit.consentBasis}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-faint">Event ID</span>
                <span className="text-ink">{detail.audit.eventId}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
