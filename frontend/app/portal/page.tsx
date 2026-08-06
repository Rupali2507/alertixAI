"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, Wallet, CreditCard, ArrowRightLeft, Settings, LogOut, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function BankingPortal() {
  const [blocked, setBlocked] = useState(false);
  const [loadingOverride, setLoadingOverride] = useState(false);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "3" && !blocked) {
        setLoadingOverride(true);
        // Ping backend simulator
        fetch("http://localhost:8001/simulate", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario: "insider_threat" })
        }).catch(() => {});
        
        // Wait for 'backend latency'
        await new Promise(r => setTimeout(r, 1000));
        setLoadingOverride(false);
        setBlocked(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [blocked]);

  return (
    <div className="min-h-screen bg-void text-ink font-sans">
      <nav className="h-16 border-b border-border bg-panel flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-brand flex items-center justify-center font-bold text-black text-xs">A</div>
          <span className="font-medium text-sm">AlphaBank Global</span>
        </div>
        <div className="flex items-center gap-4 text-mist">
          <Settings size={18} className="cursor-pointer hover:text-ink transition-colors" />
          <Link href="/login"><LogOut size={18} className="cursor-pointer hover:text-ink transition-colors" /></Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-8 pt-12">
        <header className="mb-10">
          <h1 className="text-3xl font-medium text-ink">Welcome back, User</h1>
          <p className="text-mist text-sm mt-1">Last login: Today at 2:00 AM (VPN-12 Node)</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass-card p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-mist">Available Balance</span>
              <Wallet size={16} className="text-brand" />
            </div>
            <p className="text-3xl font-medium tabular-nums">$ 24,500.00</p>
          </div>
          <div className="glass-card p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-mist">Credit Limit</span>
              <CreditCard size={16} className="text-brand" />
            </div>
            <p className="text-3xl font-medium tabular-nums">$ 50,000.00</p>
          </div>
          <div className="glass-card p-6 rounded-xl border border-border bg-panel flex flex-col justify-center">
            <button className="w-full flex items-center justify-center gap-2 bg-brand/10 text-brand py-3 rounded-lg font-medium text-sm hover:bg-brand/20 transition-colors">
              <ArrowRightLeft size={16} /> New Transfer
            </button>
          </div>
        </div>

        <div className="glass-card border border-border rounded-xl p-8">
          <h2 className="text-lg font-medium mb-6 flex items-center gap-2">
            <Settings size={18} className="text-mist" /> Advanced Account Actions
          </h2>
          
          <div className="flex flex-col gap-4 max-w-md">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <p className="text-sm font-medium">Update KYC Details</p>
                <p className="text-xs text-mist">Modify verified identity documents</p>
              </div>
              <button className="px-3 py-1.5 text-xs border border-border rounded text-mist hover:text-ink">Edit</button>
            </div>

            <div className={`flex items-center justify-between p-4 border rounded-lg transition-all ${loadingOverride ? 'border-brand shadow-[0_0_15px_rgba(202,255,51,0.2)]' : 'border-border'}`}>
              <div>
                <p className="text-sm font-medium">Balance Override</p>
                <p className="text-xs text-mist">Request manual limit extension</p>
              </div>
              <button className={`px-4 py-2 text-xs font-medium rounded transition-colors ${loadingOverride ? 'bg-brand text-black' : 'bg-panel-2 text-ink hover:bg-border'}`}>
                {loadingOverride ? "Processing..." : "Override"}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Blocked Modal */}
      {blocked && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-void border border-danger/50 shadow-[0_0_40px_rgba(255,51,102,0.15)] rounded-2xl p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-danger" />
            <div className="h-16 w-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-5">
              <ShieldAlert size={32} />
            </div>
            <h2 className="text-2xl font-bold text-ink mb-2">ACTION BLOCKED</h2>
            <p className="text-danger font-medium text-sm mb-4">Mid-session Risk Elevated (Insider Threat Signature)</p>
            <p className="text-mist text-sm mb-8 leading-relaxed">
              AlertixAI has detected anomalous behavior consistent with privilege misuse during this authenticated session. Your action has been halted and the event logged for review.
            </p>
            <button onClick={() => setBlocked(false)} className="w-full py-3 bg-panel border border-border rounded-lg text-sm font-medium hover:bg-border transition-colors">
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
