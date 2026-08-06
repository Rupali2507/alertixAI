// app/kyc-fraud/components/ScoreBreakdownCard.tsx
"use client";

import { KycApplicant } from "@/lib/kycFraudData";
import TrustGauge from "../../components/TrustGauge";

const ROWS: { key: keyof KycApplicant; label: string; invert?: boolean }[] = [
  { key: "documentAuthenticityScore", label: "Document authenticity" },
  { key: "biometricConfidenceScore", label: "Biometric + liveness" },
  { key: "dataValidityScore", label: "Data cross-validation" },
  { key: "graphFraudScore", label: "Graph fraud (risk)", invert: true },
];

const BLACKLIST_STYLE: Record<KycApplicant["blacklistFlag"], { label: string; className: string }> = {
  none: { label: "No match", className: "text-success bg-success/10 border-success/25" },
  fuzzy: { label: "Fuzzy match", className: "text-warning bg-warning/10 border-warning/25" },
  exact: { label: "Exact match", className: "text-danger bg-danger/10 border-danger/25" },
};

export default function ScoreBreakdownCard({ applicant }: { applicant: KycApplicant }) {
  const bl = BLACKLIST_STYLE[applicant.blacklistFlag];

  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <h2 className="text-base font-semibold text-ink mb-4">Composite Identity Trust Score</h2>

      <div className="flex items-center gap-5 mb-5">
        <TrustGauge score={1 - applicant.trustScore} size={110} strokeWidth={9} label="trust score" />
        <div className="flex-1 space-y-3">
          {ROWS.map((r) => {
            const raw = applicant[r.key] as number;
            const display = r.invert ? raw : raw;
            const barColor = r.invert
              ? raw >= 0.7 ? "bg-danger" : raw >= 0.35 ? "bg-warning" : "bg-success"
              : raw >= 0.85 ? "bg-success" : raw >= 0.6 ? "bg-warning" : "bg-danger";
            return (
              <div key={r.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-mist">{r.label}</span>
                  <span className="font-mono text-ink">{display.toFixed(2)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-panel-2 overflow-hidden">
                  <div className={`h-full ${barColor}`} style={{ width: `${raw * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border bg-void px-4 py-2.5">
        <span className="text-xs text-mist">Blacklist match (exact/fuzzy)</span>
        <span className={`text-xs font-medium rounded-full border px-2.5 py-0.5 ${bl.className}`}>{bl.label}</span>
      </div>
    </div>
  );
}