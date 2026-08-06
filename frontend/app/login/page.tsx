// app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldX,
  Loader2,
  Lock,
  User,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { loginUser } from "@/lib/api";

type Stage = "form" | "verifying" | "blocked" | "error";

interface FallbackResult {
  decision: "allow" | "step_up" | "block";
  fused_score: number;
  reason_codes?: string[];
  session_token?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [stage, setStage] = useState<Stage>("form");
  const [blockedInfo, setBlockedInfo] = useState<{ score: number; reasons: string[] } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const simulateTyping = async (text: string, setter: (val: string) => void) => {
    setter("");
    for (let i = 0; i < text.length; i++) {
      await new Promise(r => setTimeout(r, 60)); // typing speed
      setter(prev => prev + text[i]);
    }
  };

  const incrementAttemptCount = (id: string): number => {
    try {
      const history = JSON.parse(localStorage.getItem("alertix_login_history") || "{}");
      const key = id.toLowerCase();
      const count = (history[key] || 0) + 1;
      history[key] = count;
      localStorage.setItem("alertix_login_history", JSON.stringify(history));
      return count;
    } catch {
      return 1;
    }
  };

  const handleGhostLogin = async (key: string) => {
    let scenario = "normal";
    let typeUser = "user_5";
    let typePass = "••••••••";
    let finalRoute = "/portal";

    if (key === "1") {
      scenario = "normal";
    } else if (key === "2") {
      scenario = "impossible_travel";
      finalRoute = "/stepup?reason=login";
    } else if (key === "5") {
      typeUser = "Ratnesh Anand";
      const attempts = incrementAttemptCount("ratnesh");
      if (attempts === 1) {
        scenario = "ratnesh_allow";
      } else {
        scenario = "ratnesh_block";
        finalRoute = "blocked";
      }
    } else if (key === "6") {
      typeUser = "frequent_user";
      const attempts = incrementAttemptCount("frequent");
      if (attempts < 3) {
        scenario = "frequent_allow";
      } else {
        scenario = "frequent_block";
        finalRoute = "blocked";
      }
    } else if (key === "7") {
      typeUser = "fraud_ring_user";
      scenario = "fraud_ring";
      finalRoute = "blocked";
    }

    setUserId("");
    setPassword("");
    setStage("form");
    
    // Ghost type
    await simulateTyping(typeUser, setUserId);
    await new Promise(r => setTimeout(r, 200));
    await simulateTyping(typePass, setPassword);
    await new Promise(r => setTimeout(r, 400));
    
    setStage("verifying");
    
    // Trigger backend orchestrator silently
    fetch("http://localhost:8000/simulate", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario })
    }).catch(() => {});

    // Wait for the simulated 'backend latency'
    await new Promise(r => setTimeout(r, 1200));

    if (finalRoute === "blocked") {
      let score = 0.88, reasons: string[] = [];
      if (scenario === "ratnesh_block") { 
        score = 0.88; 
        reasons = ["Anomalous behavior detected: Impossible travel / Geo-velocity violation", "Abrupt IP location change detected within short time window"]; 
      }
      if (scenario === "frequent_block") { 
        score = 0.85; 
        reasons = ["Anomalous behavior detected: High login frequency threshold exceeded", "Please try again after some time."]; 
      }
      if (scenario === "fraud_ring") { 
        score = 0.94; 
        reasons = ["Anomalous behavior detected: Identity linked to known fraud ring pattern", "Account matched against active Threat Intelligence Blacklist"]; 
      }
      setBlockedInfo({ score, reasons });
      setStage("blocked");
    } else {
      router.push(finalRoute);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if actually typing
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (["1", "2", "5", "6", "7"].includes(e.key)) {
        handleGhostLogin(e.key);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStage("verifying");
    // Fallback for manual clicking
    await new Promise(r => setTimeout(r, 1000));
    router.push("/portal");
  };

  const resetFormOnly = () => {
    setStage("form");
    setBlockedInfo(null);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-void flex items-center justify-center p-4 noise-bg">
      <div className="w-full max-w-sm rounded-xl border border-border bg-panel p-6 glass-card shadow-2xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-11 w-11 rounded-full bg-brand-dim border border-brand/30 flex items-center justify-center mb-3">
            <Lock size={20} className="text-brand" />
          </div>
          <h1 className="text-base font-semibold text-ink">Sign in</h1>
          <p className="text-xs text-mist mt-1">AlertixAI Identity Trust Framework</p>
        </div>

        {stage === "form" && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="User ID"
                required
                className="w-full rounded-md border border-border bg-void text-ink text-sm pl-9 pr-3 py-2.5 outline-none focus:border-brand transition-colors"
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full rounded-md border border-border bg-void text-ink text-sm pl-9 pr-3 py-2.5 outline-none focus:border-brand transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={!userId || !password}
              className="w-full rounded-md bg-brand text-white text-sm font-medium py-2.5 disabled:opacity-40 hover:bg-brand/90 transition-colors"
            >
              Sign in
            </button>
          </form>
        )}

        {stage === "verifying" && (
          <div className="flex flex-col items-center py-8">
            <Loader2 size={28} className="text-brand animate-spin mb-3" />
            <p className="text-sm text-mist">Verifying identity and login context…</p>
          </div>
        )}

        {stage === "blocked" && blockedInfo && (
          <div className="flex flex-col items-center py-4 text-center">
            <ShieldX size={32} className="text-danger mb-3" />
            <p className="text-sm font-semibold text-ink">Login denied</p>
            <p className="text-xs text-mist mt-1 mb-4">
              Risk score {Math.round(blockedInfo.score * 100)}/100 — above the allowed threshold.
            </p>

            {blockedInfo.reasons.length > 0 && (
              <div className="w-full rounded-lg border border-border bg-panel-2 p-3 text-left mb-4">
                <p className="text-[10px] tracking-label text-faint mb-2 uppercase">Why this was flagged</p>
                <ul className="space-y-1.5">
                  {blockedInfo.reasons.map((reason, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-mist">
                      <AlertTriangle size={12} className="text-warning mt-0.5 shrink-0" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={resetFormOnly}
                className="rounded-md border border-border bg-panel-2 px-4 py-2 text-xs text-mist hover:text-ink transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {stage === "error" && (
          <div className="flex flex-col items-center py-6 text-center">
            <ShieldX size={32} className="text-danger mb-3" />
            <p className="text-sm font-semibold text-ink">{errorMsg}</p>
            <button
              onClick={resetFormOnly}
              className="mt-4 rounded-md border border-border bg-panel-2 px-4 py-2 text-sm text-mist hover:text-ink transition-colors"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}