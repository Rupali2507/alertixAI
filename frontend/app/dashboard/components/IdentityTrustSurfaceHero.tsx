// app/dashboard/components/IdentityTrustSurfaceHero.tsx
"use client";

import { MoreHorizontal, ArrowUpRight, ArrowDown, ArrowUp } from "lucide-react";
import TrustGauge from "../../components/TrustGauge";
import { SubScores } from "@/lib/mockData";

type Dir = "up" | "down" | "flat";

interface IdentityTrustSurfaceHeroProps {
  latestRiskScore: number; // 0-1, drives the gauge — this event's fused_score
  eventsPerHour: number;
  totalEvents: number;
  allowPct: number;
  stepUpPct: number;
  blockPct: number;
  activeBlockedCases: number; // cumulative blocks since page mount, not a live "open case" count
  subScores: SubScores; // 0-100, averaged over the visible live window
  trend?: { behavioral: Dir; deviceTrust: Dir; kycInsider: Dir };
  onViewBlocked?: () => void;
}

function TrendIcon({ dir }: { dir?: Dir }) {
  if (dir === "up") return <ArrowUp size={12} className="text-danger" />;
  if (dir === "down") return <ArrowDown size={12} className="text-success" />;
  return null;
}

export default function IdentityTrustSurfaceHero({
  latestRiskScore,
  eventsPerHour,
  totalEvents,
  allowPct,
  stepUpPct,
  blockPct,
  activeBlockedCases,
  subScores,
  trend,
  onViewBlocked,
}: IdentityTrustSurfaceHeroProps) {
  const kycInsider = Math.round((subScores.kyc + subScores.insiderMisuse) / 2);

  return (
    <div className="glass-card-strong rounded-3xl p-7 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[10%] w-[420px] h-[280px] bg-brand/[0.12] rounded-full blur-[110px] pointer-events-none" />

      <div className="flex items-start justify-between mb-6 relative z-10">
        <div className="flex items-center gap-2 text-xs text-mist">
          <span className="relative flex h-1.5 w-1.5">
            <span
              className="absolute inline-flex h-full w-full rounded-full bg-brand"
              style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
            />
          </span>
          <span className="tracking-label text-[10px] text-brand font-medium">
            LIVE · {totalEvents > 0 ? eventsPerHour.toLocaleString() : "—"} EVENTS/HR
          </span>
        </div>
        <button className="text-faint hover:text-mist p-1.5">
          <MoreHorizontal size={18} />
        </button>
      </div>

      <h2 className="text-2xl font-medium text-ink mb-8 relative z-10">Identity trust surface</h2>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 items-start relative z-10">
        <TrustGauge score={latestRiskScore} size={168} strokeWidth={13} label="trust score" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="glass-card rounded-2xl px-5 py-4">
            <p className="text-[11px] text-faint tracking-label mb-2">Allowed</p>
            <p className="text-3xl font-medium text-ink tabular-nums mb-2.5">
              {allowPct.toFixed(1)}
              <span className="text-base text-mist font-normal">%</span>
            </p>
            <div className="h-1 rounded-full bg-panel-2 overflow-hidden">
              <div className="h-full bg-success" style={{ width: `${allowPct}%` }} />
            </div>
          </div>

          <div className="glass-card rounded-2xl px-5 py-4">
            <p className="text-[11px] text-faint tracking-label mb-2">Step-up</p>
            <p className="text-3xl font-medium text-ink tabular-nums mb-2.5">
              {stepUpPct.toFixed(1)}
              <span className="text-base text-mist font-normal">%</span>
            </p>
            <div className="h-1 rounded-full bg-panel-2 overflow-hidden">
              <div className="h-full bg-warning" style={{ width: `${stepUpPct}%` }} />
            </div>
          </div>

          <div className="sm:col-span-2 rounded-2xl px-5 py-4 border border-danger/25 bg-danger/[0.06] flex items-center justify-between">
            <div>
              <p className="text-[11px] text-danger tracking-label mb-2">Blocked · Critical</p>
              <p className="text-3xl font-medium text-ink tabular-nums">
                {blockPct.toFixed(1)}
                <span className="text-base text-mist font-normal">%</span>
              </p>
            </div>
            <button
              onClick={onViewBlocked}
              disabled={activeBlockedCases === 0}
              className="flex items-center gap-1.5 rounded-full bg-danger-solid/90 text-white text-xs font-medium px-3.5 py-1.5 hover:bg-danger-solid transition-colors disabled:opacity-40 disabled:cursor-default"
            >
              {activeBlockedCases} case{activeBlockedCases === 1 ? "" : "s"} <ArrowUpRight size={13} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 relative z-10">
        {[
          { label: "behavioral", value: subScores.behavioral, dir: trend?.behavioral },
          { label: "device trust", value: subScores.deviceTrust, dir: trend?.deviceTrust },
          { label: "kyc + insider", value: kycInsider, dir: trend?.kycInsider },
        ].map((s) => (
          <div key={s.label} className="glass-card rounded-2xl px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-faint mb-1">{s.label}</p>
              <p className="text-xl font-medium text-ink tabular-nums">{(s.value / 100).toFixed(2)}</p>
            </div>
            <TrendIcon dir={s.dir} />
          </div>
        ))}
      </div>
    </div>
  );
}