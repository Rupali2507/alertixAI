"use client";

import { useState, useEffect } from "react";
import { UserPlus, ShieldX, ScanFace, Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const [name, setName] = useState("");
  const [pan, setPan] = useState("");
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<"form" | "verifying" | "blocked">("form");

  const simulateTyping = async (text: string, setter: (val: string) => void) => {
    setter("");
    for (let i = 0; i < text.length; i++) {
      await new Promise(r => setTimeout(r, 40));
      setter(prev => prev + text[i]);
    }
  };

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === "4" && stage === "form") {
        await simulateTyping("John Doe (Synthetic)", setName);
        await new Promise(r => setTimeout(r, 200));
        await simulateTyping("AAAPZ1234Q", setPan);
        await new Promise(r => setTimeout(r, 200));
        await simulateTyping("999-999-9999", setPhone);
        await new Promise(r => setTimeout(r, 400));
        
        setStage("verifying");
        
        fetch("http://localhost:8000/simulate", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario: "kyc_fraud" })
        }).catch(() => {});

        await new Promise(r => setTimeout(r, 1500));
        setStage("blocked");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stage]);

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-panel p-8 glass-card shadow-2xl relative overflow-hidden">
        
        <div className="flex flex-col items-center text-center mb-8">
          <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center mb-4">
            <UserPlus size={24} className="text-brand" />
          </div>
          <h1 className="text-xl font-semibold text-ink">Create an Account</h1>
          <p className="text-sm text-mist mt-1">Identity Verification Powered by AlertixAI</p>
        </div>

        {stage === "form" && (
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div>
              <label className="block text-xs text-mist mb-1">Full Legal Name</label>
              <input type="text" value={name} readOnly className="w-full rounded-lg border border-border bg-void text-ink px-4 py-3 outline-none" />
            </div>
            <div>
              <label className="block text-xs text-mist mb-1">PAN Number</label>
              <input type="text" value={pan} readOnly className="w-full rounded-lg border border-border bg-void text-ink px-4 py-3 outline-none font-mono" />
            </div>
            <div>
              <label className="block text-xs text-mist mb-1">Phone Number</label>
              <input type="text" value={phone} readOnly className="w-full rounded-lg border border-border bg-void text-ink px-4 py-3 outline-none font-mono" />
            </div>
            <button type="button" className="w-full mt-4 bg-brand text-black font-medium py-3 rounded-lg hover:bg-brand/90 transition-colors">
              Continue to Face Scan <ScanFace size={16} className="inline ml-1 mb-0.5" />
            </button>
          </form>
        )}

        {stage === "verifying" && (
          <div className="flex flex-col items-center py-12">
            <Loader2 size={32} className="text-brand animate-spin mb-4" />
            <p className="text-sm font-medium text-ink mb-1">Verifying Identity</p>
            <p className="text-xs text-mist">Checking deduplication and KYC bureaus...</p>
          </div>
        )}

        {stage === "blocked" && (
          <div className="flex flex-col items-center py-8 text-center animate-in zoom-in-95">
            <ShieldX size={48} className="text-danger mb-4" />
            <h2 className="text-lg font-bold text-ink">Registration Blocked</h2>
            <p className="text-sm text-danger font-medium mt-1 mb-4">Identity Verification Failed</p>
            <div className="bg-danger/10 border border-danger/20 rounded-lg p-4 text-left w-full">
              <p className="text-[10px] uppercase tracking-wider text-danger mb-2 font-semibold">REASON CODES (CatBoost)</p>
              <ul className="text-xs text-mist space-y-2 list-disc list-inside">
                <li>PII Hash Collision: PAN associated with 3 other active identities</li>
                <li>Device-to-Identity cardinality exceeds normal threshold</li>
                <li>Synthetic Identity Pattern Match: 98% Confidence</li>
              </ul>
            </div>
            <button onClick={() => {setName(""); setPan(""); setPhone(""); setStage("form");}} className="mt-6 text-sm text-mist hover:text-ink">
              Start Over
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
