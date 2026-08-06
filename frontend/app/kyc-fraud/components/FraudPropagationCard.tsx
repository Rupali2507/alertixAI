// app/kyc-fraud/components/FraudPropagationCard.tsx
"use client";

import { GitBranch } from "lucide-react";
import { AttentionContribution, EDGE_LABEL } from "@/lib/kycFraudData";

export default function FraudPropagationCard({
  graphFraudScore,
  contributions,
}: {
  graphFraudScore: number;
  contributions: AttentionContribution[];
}) {
  const risky = graphFraudScore >= 0.35;

  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <div className="flex items-center gap-2 mb-1">
        <GitBranch size={15} className="text-brand" />
        <h2 className="text-base font-semibold text-ink">Why this score</h2>
      </div>

      {contributions.length === 0 ? (
        <div className="mt-3">
          <p className="text-sm text-ink mb-1">No connection to any past fraud case found.</p>
          <p className="text-xs text-mist">
            This applicant&apos;s device, IP, and face match don&apos;t overlap with anything in the fraud history.
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-ink mb-4">
            {risky
              ? "This application is connected to a confirmed fraud case through shared infrastructure:"
              : "A weak connection was found, but it's not enough on its own to flag this case:"}
          </p>
          <div className="space-y-3">
            {contributions.map((c, i) => (
              <div key={i} className="rounded-lg border border-border bg-void px-3.5 py-3">
                <p className="text-sm text-ink mb-1.5">
                  Same <span className="text-brand font-medium">{EDGE_LABEL[c.relation].toLowerCase()}</span> as a
                  confirmed fraud case (<span className="font-mono text-danger">{c.neighborLabel}</span>)
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-panel-2 overflow-hidden">
                    <div className="h-full bg-danger" style={{ width: `${c.attentionWeight * 100}%` }} />
                  </div>
                  <span className="text-[11px] font-mono text-faint w-10 text-right">
                    {(c.attentionWeight * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg bg-void border border-border px-4 py-2.5 mt-4">
        <span className="text-xs text-mist">Overall connection risk</span>
        <span
          className={`text-sm font-mono font-semibold ${
            graphFraudScore >= 0.7 ? "text-danger" : graphFraudScore >= 0.35 ? "text-warning" : "text-success"
          }`}
        >
          {graphFraudScore.toFixed(2)}
        </span>
      </div>
    </div>
  );
}