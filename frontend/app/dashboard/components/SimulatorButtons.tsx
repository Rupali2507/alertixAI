import { Play } from "lucide-react";

export default function SimulatorButtons() {
  const triggerSimulation = async (scenario: string) => {
    try {
      await fetch("http://localhost:8000/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
    } catch (err) {
      console.error("Simulation failed:", err);
    }
  };

  return (
    <div className="bg-panel-2/30 border border-border rounded-lg p-4 mb-6">
      <h3 className="text-xs font-bold text-mist uppercase tracking-widest mb-3">Live Demo Injection</h3>
      <div className="flex flex-wrap gap-3">
        <button 
          onClick={() => triggerSimulation("normal")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-panel text-xs text-ink hover:border-brand/50 transition-colors"
        >
          <Play size={12} className="text-success" />
          Normal Login (Allow)
        </button>
        <button 
          onClick={() => triggerSimulation("impossible_travel")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-panel text-xs text-ink hover:border-warning/50 transition-colors"
        >
          <Play size={12} className="text-warning" />
          New Device at 2 AM (Step-Up)
        </button>
        <button 
          onClick={() => triggerSimulation("kyc_fraud")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-panel text-xs text-ink hover:border-danger/50 transition-colors"
        >
          <Play size={12} className="text-danger" />
          KYC Fraud (Block)
        </button>
        <button 
          onClick={() => triggerSimulation("insider_threat")}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-panel text-xs text-ink hover:border-danger/50 transition-colors"
        >
          <Play size={12} className="text-danger" />
          Insider Threat (Block)
        </button>
      </div>
    </div>
  );
}
