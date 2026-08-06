// app/dashboard/components/RiskCategoryGrid.tsx
"use client";

import { Activity, Laptop2, IdCard, UserSearch, ArrowRight } from "lucide-react";
import { SubScores } from "@/lib/mockData";

const ALLOW_MAX = 0.35;
const STEP_UP_MAX = 0.70;

interface CategoryDef {
  key: keyof SubScores;
  label: string;
  detector: string;
  description: string;
  icon: typeof Activity;
}

const CATEGORIES: CategoryDef[] = [
  {
    key: "behavioral",
    label: "Anomalous Behavior",
    detector: "Isolation Forest + Autoencoder",
    description: "Login velocity, off-hour access, transaction pattern deviation from user baseline.",
    icon: Activity,
  },
  {
    key: "deviceTrust",
    label: "New Device Usage",
    detector: "GraphSAGE + GAT link prediction",
    description: "First-seen devices, device/IP fan-out across unrelated accounts.",
    icon: Laptop2,
  },
  {
    key: "kyc",
    label: "Suspicious Onboarding",
    detector: "CatBoost + SHAP",
    description: "Identity reuse across accounts, rapid KYC edits, edit-to-transaction bursts.",
    icon: IdCard,
  },
  {
    key: "insiderMisuse",
    label: "Privileged Access Misuse",
    detector: "Cohort Isolation Forest + rule engine",
    description: "Balance overrides, mass exports, peer-cohort deviation for admin roles.",
    icon: UserSearch,
  },
];

function statusFor(score01: number): { label: string; className: string; dot: string } {
  if (score01 < ALLOW_MAX) return { label: "Nominal", className: "text-success", dot: "bg-success" };
  if (score01 < STEP_UP_MAX) return { label: "Elevated", className: "text-warning", dot: "bg-warning" };
  return { label: "Critical", className: "text-danger", dot: "bg-danger" };
}

interface RiskCategoryGridProps {
  subScores: SubScores; // 0-100, live-window average
  flaggedCounts: SubScores; // cumulative count of events where this category crossed ALLOW_MAX since mount
  onSelectCategory?: (key: keyof SubScores) => void;
}

export default function RiskCategoryGrid({ subScores, flaggedCounts, onSelectCategory }: RiskCategoryGridProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-medium text-ink">Risk categories under continuous validation</h2>
        <span className="text-[11px] text-faint">Live window average · last 8 events</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {CATEGORIES.map(({ key, label, detector, description, icon: Icon }) => {
          const score01 = subScores[key] / 100;
          const status = statusFor(score01);
          return (
            <button
              key={key}
              onClick={() => onSelectCategory?.(key)}
              className="text-left glass-card rounded-2xl p-5 hover:border-brand/30 transition-colors group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="h-9 w-9 rounded-lg bg-brand-dim border border-brand/25 flex items-center justify-center">
                  <Icon size={16} className="text-brand" />
                </div>
                <span className={`flex items-center gap-1.5 text-[11px] font-medium ${status.className}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
              </div>

              <p className="text-sm font-medium text-ink mb-1">{label}</p>
              <p className="text-[11px] text-faint font-mono mb-3">{detector}</p>

              <div className="flex items-end justify-between mb-3">
                <span className="text-2xl font-medium text-ink tabular-nums">{score01.toFixed(2)}</span>
                <span className="text-[11px] text-mist">{flaggedCounts[key]} flagged</span>
              </div>

              <div className="h-1 rounded-full bg-panel-2 overflow-hidden mb-3">
                <div
                  className={status.label === "Critical" ? "h-full bg-danger" : status.label === "Elevated" ? "h-full bg-warning" : "h-full bg-success"}
                  style={{ width: `${Math.min(score01 * 100, 100)}%` }}
                />
              </div>

              <p className="text-[11px] text-mist leading-relaxed line-clamp-2">{description}</p>

              <span className="mt-3 flex items-center gap-1 text-[11px] text-brand opacity-0 group-hover:opacity-100 transition-opacity">
                View flagged case <ArrowRight size={11} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}