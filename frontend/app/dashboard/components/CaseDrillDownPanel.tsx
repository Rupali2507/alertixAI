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
  
  // Parse DNA based on raw_event
  const typing = detail.raw_event?.typing_cadence_score ? Math.round(detail.raw_event.typing_cadence_score * 100) : 85;
  const device = detail.subScores.deviceTrust ? (100 - detail.subScores.deviceTrust) : 90;
  const location = detail.subScores.kyc ? (100 - detail.subScores.kyc) : 95;
  const velocity = detail.raw_event?.transaction_amount > 5000 ? 10 : 90;

  return (
    <>
      {/* backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />

      {/* panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-panel border-l border-border z-50 overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-panel/90 backdrop-blur-md z-10">
          <div>
            <p className="text-[10px] text-faint font-mono uppercase tracking-widest mb-1">Identity Investigation</p>
            <h2 className="text-lg font-bold text-ink font-mono">{detail.hmac}</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-xs font-bold uppercase tracking-wider rounded-md border px-3 py-1.5 ${style.className} shadow-inner`}>
              {style.label}
            </span>
            <button onClick={onClose} className="text-mist hover:text-ink transition-colors bg-panel-2 p-2 rounded-md">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          
          {/* Timeline & Replay */}
          <div>
            <h3 className="text-xs font-bold text-mist tracking-widest uppercase mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand animate-pulse"></span> Fraud Replay Timeline
            </h3>
            <div className="border-l-2 border-border ml-2 space-y-4 relative">
              <div className="relative pl-6">
                <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-success"></span>
                <p className="text-xs text-faint font-mono">T-02:00</p>
                <p className="text-sm text-mist">Standard login authenticated</p>
              </div>
              <div className="relative pl-6">
                <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-warning"></span>
                <p className="text-xs text-faint font-mono">T-00:15</p>
                <p className="text-sm text-warning">New IP observed (Location Change)</p>
              </div>
              <div className="relative pl-6">
                <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-danger"></span>
                <p className="text-xs text-faint font-mono">T-00:00</p>
                <p className="text-sm text-danger font-medium">Anomaly sequence detected. Evaluating Trust.</p>
              </div>
            </div>
          </div>

          {/* Identity DNA */}
          <div>
             <h3 className="text-xs font-bold text-mist tracking-widest uppercase mb-4">Identity DNA Fingerprint</h3>
             <div className="bg-panel-2 rounded-xl p-5 space-y-4 border border-border">
                {[
                  { label: "Typing Rhythm", val: typing },
                  { label: "Device Familiarity", val: device },
                  { label: "Location Habit", val: location },
                  { label: "Transaction Velocity", val: velocity }
                ].map(dna => (
                  <div key={dna.label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-mist">{dna.label}</span>
                      <span className="font-mono text-ink">{dna.val}% Match</span>
                    </div>
                    <div className="h-1.5 w-full bg-void rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${dna.val > 70 ? 'bg-brand' : dna.val > 40 ? 'bg-warning' : 'bg-danger'}`}
                        style={{ width: `${dna.val}%` }}
                      />
                    </div>
                  </div>
                ))}
             </div>
          </div>

          {/* LLM Investigator Report */}
          <div className="rounded-xl bg-brand/5 border border-brand/20 p-5 shadow-[inset_0_0_20px_rgba(6,182,212,0.05)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-brand"></div>
            <h3 className="text-xs font-bold text-brand tracking-widest uppercase mb-3 flex items-center gap-2">
              LLM Investigator Report
            </h3>
            <p className="text-sm text-ink leading-relaxed font-serif">
              {detail.investigator_report || "The neural engine has verified this identity trajectory. No anomalies detected."}
            </p>
          </div>

          {/* Privacy Vault Log */}
          <div>
            <h3 className="text-xs font-bold text-mist tracking-widest uppercase mb-4">Privacy Vault Compliance</h3>
            <div className="rounded-xl bg-void border border-border p-4 space-y-2 text-[11px] font-mono">
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-faint">Raw PII Hash</span>
                <span className="text-ink">{detail.hmac}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2 pt-1">
                <span className="text-faint">Consent Basis</span>
                <span className="text-success">{detail.audit.consentBasis}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-faint">ML Pipeline Status</span>
                <span className="text-brand">Tokenized</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
