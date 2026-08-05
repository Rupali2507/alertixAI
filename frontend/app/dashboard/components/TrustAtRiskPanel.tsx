import { HighRiskEvent } from "@/lib/mockData";

interface TrustAtRiskPanelProps {
  events: HighRiskEvent[];
  onRowClick: (event: HighRiskEvent) => void;
}

export default function TrustAtRiskPanel({ events, onRowClick }: TrustAtRiskPanelProps) {
  // Aggregate real events into mock "Identity Personas" for the demo story
  // In a real production system, this would map directly to user role tags from the backend
  
  const customersAtRisk = events.filter(e => e.score > 50).length * 10;
  const enterprisesAtRisk = events.filter(e => e.score > 70).length * 5;
  const adminsAtRisk = events.filter(e => e.score > 90).length;

  return (
    <div className="rounded-xl bg-panel border border-border shadow-lg overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-border bg-panel-2/30">
        <h2 className="text-sm font-bold text-ink uppercase tracking-widest">
          Who Are We Losing Trust In?
        </h2>
        <p className="text-xs text-mist mt-1 font-mono">Live Identity Degradation</p>
      </div>

      <div className="p-6 space-y-6 flex-1">
        
        {/* Customer Identity Bar */}
        <div className="space-y-2 group cursor-pointer" onClick={() => events[0] && onRowClick(events[0])}>
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-ink group-hover:text-brand transition-colors">Customer Identities</span>
            <span className="font-mono text-danger">{customersAtRisk} at risk</span>
          </div>
          <div className="h-3 w-full bg-void rounded-full overflow-hidden border border-border/50">
            <div 
              className="h-full bg-danger rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
              style={{ width: `${Math.min(customersAtRisk * 2, 100)}%` }}
            />
          </div>
        </div>

        {/* Enterprise Identity Bar */}
        <div className="space-y-2 group cursor-pointer" onClick={() => events[1] && onRowClick(events[1])}>
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-ink group-hover:text-brand transition-colors">Enterprise Partners</span>
            <span className="font-mono text-warning">{enterprisesAtRisk} at risk</span>
          </div>
          <div className="h-3 w-full bg-void rounded-full overflow-hidden border border-border/50">
            <div 
              className="h-full bg-warning rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(251,146,60,0.5)]"
              style={{ width: `${Math.min(enterprisesAtRisk * 5, 100)}%` }}
            />
          </div>
        </div>

        {/* Administrator Identity Bar */}
        <div className="space-y-2 group cursor-pointer" onClick={() => events.find(e => e.score > 90) && onRowClick(events.find(e => e.score > 90)!)}>
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-ink group-hover:text-brand transition-colors">System Administrators</span>
            <span className="font-mono text-brand">{adminsAtRisk} at risk</span>
          </div>
          <div className="h-3 w-full bg-void rounded-full overflow-hidden border border-border/50">
            <div 
              className="h-full bg-brand rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
              style={{ width: `${Math.min(adminsAtRisk * 15, 100)}%` }}
            />
          </div>
        </div>

        <div className="pt-6 border-t border-border mt-auto">
           <h3 className="text-xs font-mono text-faint uppercase mb-3">Live Anomalous Identities (Recent)</h3>
           <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
             {events.slice(0, 4).map((evt, idx) => (
               <div 
                 key={evt.id || idx} 
                 onClick={() => onRowClick(evt)}
                 className="flex justify-between items-center p-2 rounded bg-panel-2 border border-transparent hover:border-brand/30 cursor-pointer transition-colors"
               >
                 <span className="text-xs font-mono text-mist truncate max-w-[150px]">{evt.hmac}</span>
                 <span className={`text-xs font-bold px-2 py-0.5 rounded ${evt.decision === 'block' ? 'bg-danger/20 text-danger' : 'bg-brand/20 text-brand'}`}>
                   Trust: {100 - evt.score}
                 </span>
               </div>
             ))}
           </div>
        </div>

      </div>
    </div>
  );
}
