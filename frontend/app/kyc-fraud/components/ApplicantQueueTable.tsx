// app/kyc-fraud/components/ApplicantQueueTable.tsx
"use client";

import { KycApplicant, KycDecision } from "@/lib/kycFraudData";

const DECISION_LABEL: Record<KycDecision, string> = {
  straight_through: "STRAIGHT-THROUGH",
  step_up: "STEP-UP",
  manual_review: "MANUAL REVIEW",
  hard_reject: "HARD REJECT",
};

const DECISION_COLOR: Record<KycDecision, string> = {
  straight_through: "text-success",
  step_up: "text-warning",
  manual_review: "text-warning",
  hard_reject: "text-danger",
};

export default function ApplicantQueueTable({
  applicants,
  selectedId,
  onSelect,
}: {
  applicants: KycApplicant[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <h2 className="text-base font-semibold text-ink mb-4">Onboarding Queue</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-faint uppercase tracking-wide text-left">
            <th className="pb-2 font-medium">Applicant</th>
            <th className="pb-2 font-medium">Trust</th>
            <th className="pb-2 font-medium">Graph risk</th>
            <th className="pb-2 font-medium text-right">Decision</th>
          </tr>
        </thead>
        <tbody>
          {applicants.map((a) => (
            <tr
              key={a.applicantId}
              onClick={() => onSelect(a.applicantId)}
              className={`border-t border-border cursor-pointer hover:bg-panel-2 transition-colors ${
                a.applicantId === selectedId ? "bg-panel-2" : ""
              }`}
            >
              <td className="py-2.5">
                <p className="text-ink font-medium">{a.name}</p>
                <p className="text-[11px] text-faint font-mono">{a.applicantId}</p>
              </td>
              <td className="py-2.5 font-mono text-ink">{a.trustScore.toFixed(2)}</td>
              <td className="py-2.5 font-mono text-mist">{a.graphFraudScore.toFixed(2)}</td>
              <td className={`py-2.5 text-right font-mono text-xs font-semibold ${DECISION_COLOR[a.decision]}`}>
                {DECISION_LABEL[a.decision]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}