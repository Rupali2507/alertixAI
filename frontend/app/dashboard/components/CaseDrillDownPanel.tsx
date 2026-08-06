// app/dashboard/components/CaseDrillDownPanel.tsx
"use client";

import { X, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { CaseDetail, Decision } from "@/lib/mockData";
import TrustGauge from "../../components/TrustGauge";
import SubScoreBreakdown from "./SubScoreBreakdown";
import SHAPReasonCodes from "./SHAPReasonCodes";
import DeviceGraphView from "./DeviceGraphView";
import { triggerStepUpAuth } from "@/lib/api";

interface CaseDrillDownPanelProps {
  detail: CaseDetail | null;
  onClose: () => void;
}

const DECISION_STYLES: Record<Decision, { label: string; className: string }> = {
  allow: { label: "Allow", className: "bg-success/10 text-success border-success/30" },
  step_up: { label: "Step-up", className: "bg-brand-dim text-brand border-brand/30" },
  block: { label: "Block", className: "bg-danger-solid text-white border-transparent" },
};

// Only fields that actually exist on the event, shown per event_type —
// nothing here is synthesized.
function eventDetailRows(rawEvent: any): { label: string; value: string }[] {
  if (!rawEvent) return [];
  const rows: { label: string; value: string }[] = [
    { label: "Event type", value: rawEvent.event_type ?? "—" },
    { label: "Device ID", value: rawEvent.device_id ?? "—" },
    { label: "IP address", value: rawEvent.ip_address ?? "—" },
    { label: "Timestamp", value: rawEvent.timestamp ? new Date(rawEvent.timestamp).toISOString() : "—" },
  ];
  if (rawEvent.event_type === "login") {
    rows.push({ label: "Login success", value: String(rawEvent.login_success) });
  }
  if (rawEvent.event_type === "transaction") {
    rows.push({ label: "Amount", value: rawEvent.txn_amount != null ? `₹${rawEvent.txn_amount}` : "—" });
    rows.push({ label: "Beneficiary", value: rawEvent.beneficiary_id ?? "—" });
  }
  if (rawEvent.event_type === "onboarding") {
    rows.push({ label: "KYC field changed", value: rawEvent.kyc_field_changed ?? "—" });
    rows.push({ label: "Edits (7d)", value: String(rawEvent.kyc_edit_count_7d ?? "—") });
    rows.push({ label: "Hours since last edit", value: String(rawEvent.time_since_last_kyc_edit_hours ?? "—") });
  }
  if (rawEvent.event_type === "admin_action") {
    rows.push({ label: "Action type", value: rawEvent.admin_action_type ?? "—" });
    rows.push({ label: "Admin role", value: rawEvent.admin_role ?? "—" });
    if (rawEvent.txn_amount != null) rows.push({ label: "Override amount", value: `₹${rawEvent.txn_amount}` });
  }
  return rows;
}

export default function CaseDrillDownPanel({ detail, onClose }: CaseDrillDownPanelProps) {
  const [stepUpStatus, setStepUpStatus] = useState<"idle" | "loading" | "success">("idle");
  if (!detail) return null;
  const style = DECISION_STYLES[detail.decision];

  const handleStepUp = async () => {
    setStepUpStatus("loading");
    try {
      await triggerStepUpAuth(detail.id || detail.audit.eventId, "otp");
      setStepUpStatus("success");
    } catch (e) {
      setStepUpStatus("idle");
      console.error(e);
    }
  };

  const rows = eventDetailRows(detail.raw_event);

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed top-0 right-0 h-full w-full max-w-lg glass-card-strong border-l border-border z-50 overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-panel/90 backdrop-blur-md z-10">
          <div>
            <p className="text-[10px] text-faint tracking-label mb-1">Identity Investigation</p>
            <h2 className="text-lg font-medium text-ink font-mono">{detail.hmac}</h2>
          </div>
          <div className="flex items-center gap-3">
            {detail.decision === "step_up" && (
              <button
                onClick={handleStepUp}
                disabled={stepUpStatus !== "idle"}
                className="text-xs font-medium bg-brand text-white px-3 py-1.5 rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-50"
              >
                {stepUpStatus === "idle" ? "Verify User (OTP)" : stepUpStatus === "loading" ? "Verifying..." : "Verified ✓"}
              </button>
            )}
            <span className={`text-xs font-medium tracking-wide rounded-full border px-3 py-1.5 ${style.className}`}>
              {style.label}
            </span>
            <button onClick={onClose} className="text-mist hover:text-ink transition-colors glass-card p-2 rounded-lg">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Trust score */}
          <div className="glass-card rounded-2xl p-6 flex items-center gap-6">
            <TrustGauge score={detail.score / 100} size={110} strokeWidth={9} showValue />
            <div>
              <p className="text-[11px] text-faint tracking-label mb-1">Fused decision</p>
              <p className="text-sm text-ink">
                Risk score <span className="font-mono text-ink">{(detail.score / 100).toFixed(2)}</span> at{" "}
                {new Date(detail.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <SubScoreBreakdown subScores={detail.subScores} />
          <SHAPReasonCodes reasonCodes={detail.reasonCodes} />
          <DeviceGraphView graph={detail.deviceGraph} />

          {/* Event details — real fields only */}
          <div>
            <h3 className="text-sm font-medium text-mist mb-3 tracking-label text-[11px]">Event Details</h3>
            <div className="glass-card rounded-2xl p-4 space-y-2 text-xs font-mono">
              {rows.map((r) => (
                <div key={r.label} className="flex justify-between gap-4 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                  <span className="text-faint">{r.label}</span>
                  <span className="text-ink text-right truncate max-w-[220px]">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Investigator report */}
          {detail.investigator_report && (
            <div className="rounded-2xl bg-brand/5 border border-brand/20 p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-brand" />
              <h3 className="text-[11px] font-medium text-brand tracking-label mb-3">LLM Investigator Report</h3>
              <p className="text-sm text-ink leading-relaxed">{detail.investigator_report}</p>
            </div>
          )}

          {/* Privacy / audit */}
          <div>
            <h3 className="text-sm font-medium text-mist mb-3 tracking-label text-[11px]">Privacy Vault Compliance</h3>
            <div className="rounded-2xl bg-void border border-border p-4 space-y-2 text-[11px] font-mono">
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-faint">Raw PII Hash</span>
                <span className="text-ink">{detail.hmac}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2 pt-1">
                <span className="text-faint">Consent Basis</span>
                <span className="text-success">{detail.audit.consentBasis}</span>
              </div>
              <div className="flex justify-between pt-1 items-center">
                <span className="text-faint">ML Pipeline Status</span>
                <span className="text-brand flex items-center gap-1">
                  <ShieldCheck size={12} /> Tokenized
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}