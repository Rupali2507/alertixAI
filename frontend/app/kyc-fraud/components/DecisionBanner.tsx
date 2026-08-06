// app/kyc-fraud/components/DecisionBanner.tsx
"use client";

import { CheckCircle2, ShieldAlert, Search, ShieldX } from "lucide-react";
import { KycApplicant, KycDecision } from "@/lib/kycFraudData";

const DECISION_META: Record<
  KycDecision,
  { label: string; sub: string; icon: typeof CheckCircle2; className: string }
> = {
  straight_through: {
    label: "Approved automatically",
    sub: "No red flags — onboarding completes with no extra steps for the applicant.",
    icon: CheckCircle2,
    className: "border-success/30 bg-success/[0.06] text-success",
  },
  step_up: {
    label: "Extra verification requested",
    sub: "Minor risk signals — the applicant is asked for one more document or an OTP.",
    icon: ShieldAlert,
    className: "border-warning/30 bg-warning/[0.06] text-warning",
  },
  manual_review: {
    label: "Sent to a human reviewer",
    sub: "Enough uncertainty here that an analyst should look at it before any decision.",
    icon: Search,
    className: "border-warning/40 bg-warning/[0.08] text-warning",
  },
  hard_reject: {
    label: "Blocked — matches a known fraud case",
    sub: "Sent to the fraud team quietly rather than rejected on-screen, so the applicant isn't tipped off.",
    icon: ShieldX,
    className: "border-danger/30 bg-danger/[0.06] text-danger",
  },
};

export default function DecisionBanner({ applicant }: { applicant: KycApplicant }) {
  const meta = DECISION_META[applicant.decision];
  const Icon = meta.icon;

  return (
    <div className={`rounded-xl border p-5 flex items-start gap-4 ${meta.className}`}>
      <Icon size={22} className="shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold">{meta.label}</p>
        <p className="text-xs text-mist mt-1">{meta.sub}</p>
      </div>
    </div>
  );
}