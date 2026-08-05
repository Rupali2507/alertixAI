import { Info, X } from "lucide-react";
import { useState } from "react";

export default function WelcomeBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-brand/20 bg-brand/5 p-6 shadow-[0_0_40px_-10px_rgba(99,102,241,0.1)] backdrop-blur-xl mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-brand via-purple-500 to-transparent"></div>
      
      <button 
        onClick={() => setIsVisible(false)}
        className="absolute top-4 right-4 text-mist hover:text-ink transition-colors"
        title="Dismiss guide"
      >
        <X size={20} />
      </button>

      <div className="flex items-start gap-4">
        <div className="mt-1 rounded-full bg-brand/20 p-2 text-brand">
          <Info size={24} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-ink">Welcome to the AlertixAI Demo</h2>
          <p className="text-mist max-w-3xl leading-relaxed">
            This dashboard displays a live stream of banking events (logins, transactions) being scored by 4 distinct Machine Learning models in real-time. 
            The system acts as a <strong>Decision Engine</strong>, returning one of three outcomes:
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <div className="flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-sm font-medium text-success shadow-sm">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse"></span> Allow
            </div>
            <div className="flex items-center gap-2 rounded-full border border-warning/20 bg-warning/10 px-3 py-1 text-sm font-medium text-warning shadow-sm">
              <span className="h-2 w-2 rounded-full bg-warning animate-pulse"></span> Step-Up Auth
            </div>
            <div className="flex items-center gap-2 rounded-full border border-danger/20 bg-danger/10 px-3 py-1 text-sm font-medium text-danger shadow-sm">
              <span className="h-2 w-2 rounded-full bg-danger animate-pulse"></span> Block
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
