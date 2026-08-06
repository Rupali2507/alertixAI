import { CheckCircle2 } from "lucide-react";

interface IdentityConfidenceHeroProps {
  confidenceScore: number;
}

export default function IdentityConfidenceHero({ confidenceScore }: IdentityConfidenceHeroProps) {
  const isHigh = confidenceScore >= 90;
  
  return (
    <div className="rounded-2xl bg-panel border border-border p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
      {/* Background aesthetic */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand/10 to-transparent pointer-events-none"></div>

      <div className="flex-1 space-y-4 relative z-10">
        <h1 className="text-sm font-bold text-mist uppercase tracking-[0.3em]">
          Current Identity Confidence
        </h1>
        <div className="flex items-baseline gap-2">
          <span className={`text-8xl font-black font-mono tracking-tighter ${isHigh ? 'text-brand' : 'text-danger'}`}>
            {confidenceScore}%
          </span>
        </div>
      </div>

      <div className="flex-1 bg-panel-2 rounded-xl border border-border p-6 relative z-10">
        <p className="text-xs font-mono text-faint uppercase tracking-wider mb-4 border-b border-border pb-2">
          Confidence Maintained Through
        </p>
        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
          {[
            "Behavioral Consistency",
            "Device Familiarity",
            "Network Integrity",
            "Transaction Velocity",
            "Graph Trust Proximity",
            "Insider Signals"
          ].map((item, i) => (
            <div key={item} className="flex items-center gap-3">
              <CheckCircle2 size={16} className={isHigh ? 'text-success' : i > 3 ? 'text-danger animate-pulse' : 'text-success'} />
              <span className="text-sm text-ink font-medium">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
