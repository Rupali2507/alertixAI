// app/login/page.tsx
"use client";

import { useState } from "react";
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

  // Read & increment attempt count in local storage
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

  // Reset local demo counters
  const resetDemoCounters = () => {
    localStorage.removeItem("alertix_login_history");
    setStage("form");
    setBlockedInfo(null);
    setErrorMsg(null);
  };

  const handleProcessResult = (result: FallbackResult) => {
    if (result.decision === "block") {
      setBlockedInfo({ score: result.fused_score, reasons: result.reason_codes || [] });
      setStage("blocked");
      return;
    }

    if (result.decision === "step_up") {
      router.push(`/stepup?reason=login&score=${result.fused_score}`);
      return;
    }

    // allow
    if (result.session_token) {
      window.localStorage.setItem("alertixai_session", result.session_token);
    }
    router.push("/dashboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !password) return;

    setStage("verifying");
    setErrorMsg(null);

    const normalizedUser = userId.trim().toLowerCase();

    // -----------------------------------------------------------------
    // DEMO SCENARIO INTERCEPTORS
    // -----------------------------------------------------------------

    // SCENARIO 3: Known Flagged / Fraud Ring Account
    if (
      normalizedUser.includes("flagged") ||
      normalizedUser.includes("fraud") ||
      normalizedUser.includes("ring") ||
      normalizedUser.includes("bad_actor")
    ) {
      await new Promise((res) => setTimeout(res, 600));
      handleProcessResult({
        decision: "block",
        fused_score: 0.94,
        reason_codes: [
          "Anomalous behavior detected: Identity linked to known fraud ring pattern",
          "Account matched against active Threat Intelligence Blacklist",
        ],
      });
      return;
    }

    // SCENARIO 1: Ratnesh Anand — 1st Attempt ALLOW, 2nd Attempt VPN BLOCK
    if (normalizedUser.includes("ratnesh") || normalizedUser.includes("anand")) {
      const attempts = incrementAttemptCount("ratnesh_anand");
      await new Promise((res) => setTimeout(res, 600));

      if (attempts === 1) {
        handleProcessResult({
          decision: "allow",
          fused_score: 0.12,
          reason_codes: [],
          session_token: "mock_session_ratnesh_001",
        });
      } else {
        handleProcessResult({
          decision: "block",
          fused_score: 0.88,
          reason_codes: [
            "Anomalous behavior detected: Impossible travel / Geo-velocity violation",
            "Abrupt IP location change detected within short time window",
          ],
        });
      }
      return;
    }

    // SCENARIO 2: Continuous Logins (Attempts 1 & 2 ALLOW, Attempt 3 BLOCK)
    const currentCount = incrementAttemptCount(normalizedUser);
    await new Promise((res) => setTimeout(res, 600));

    if (currentCount < 3) {
      handleProcessResult({
        decision: "allow",
        fused_score: 0.10,
        reason_codes: [],
        session_token: `mock_session_${Date.now()}`,
      });
    } else {
      handleProcessResult({
        decision: "block",
        fused_score: 0.85,
        reason_codes: [
          "Anomalous behavior detected: High login frequency threshold exceeded",
          "Please try again after some time.",
        ],
      });
    }
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
              <button
                onClick={resetDemoCounters}
                className="flex items-center gap-1 rounded-md border border-border bg-panel-2 px-3 py-2 text-xs text-faint hover:text-mist transition-colors"
                title="Reset scenario attempt counters"
              >
                <RotateCcw size={12} /> Reset Demo State
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