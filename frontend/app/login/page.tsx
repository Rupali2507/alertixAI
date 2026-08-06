// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ShieldX,
  Loader2,
  Lock,
  User,
  AlertTriangle,
} from "lucide-react";
import { loginUser } from "@/lib/api";

type Stage = "form" | "verifying" | "blocked" | "error";

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [stage, setStage] = useState<Stage>("form");
  const [blockedInfo, setBlockedInfo] = useState<{ score: number; reasons: string[] } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStage("verifying");
    setErrorMsg(null);

    try {
      const result = await loginUser(userId, password);

      if (result.decision === "block") {
        setBlockedInfo({ score: result.fused_score, reasons: result.reason_codes });
        setStage("blocked");
        return;
      }

      if (result.decision === "step_up") {
        // Reuse the existing step-up flow — pass context via query params
        // so /stepup can show why (fused_score) without a second fetch.
        router.push(`/stepup?reason=login&score=${result.fused_score}`);
        return;
      }

      // allow
      if (result.session_token) {
        window.localStorage.setItem("alertixai_session", result.session_token);
      }
      router.push("/dashboard");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Login failed");
      setStage("error");
    }
  };

  const reset = () => {
    setStage("form");
    setBlockedInfo(null);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-void flex items-center justify-center p-4 noise-bg">
      <div className="w-full max-w-sm rounded-xl border border-border bg-panel p-6 glass-card">
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
                className="w-full rounded-md border border-border bg-void text-ink text-sm pl-9 pr-3 py-2.5 outline-none focus:border-brand"
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
                className="w-full rounded-md border border-border bg-void text-ink text-sm pl-9 pr-3 py-2.5 outline-none focus:border-brand"
              />
            </div>
            <button
              type="submit"
              disabled={!userId || !password}
              className="w-full rounded-md bg-brand text-white text-sm font-medium py-2.5 disabled:opacity-40"
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
                <p className="text-[10px] tracking-label text-faint mb-2">Why this was flagged</p>
                <ul className="space-y-1.5">
                  {blockedInfo.reasons.map((reason, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-mist">
                      <AlertTriangle size={12} className="text-warning mt-0.5 shrink-0" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={reset}
              className="rounded-md border border-border bg-panel-2 px-4 py-2 text-sm text-mist hover:text-ink"
            >
              Try again
            </button>
          </div>
        )}

        {stage === "error" && (
          <div className="flex flex-col items-center py-6 text-center">
            <ShieldX size={32} className="text-danger mb-3" />
            <p className="text-sm font-semibold text-ink">{errorMsg}</p>
            <button
              onClick={reset}
              className="mt-4 rounded-md border border-border bg-panel-2 px-4 py-2 text-sm text-mist hover:text-ink"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
