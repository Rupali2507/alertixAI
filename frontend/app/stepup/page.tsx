// app/stepup/page.tsx
"use client";

import { useState } from "react";
import {
  ShieldAlert,
  KeyRound,
  Fingerprint,
  ScanFace,
  ShieldCheck,
  ShieldX,
  Loader2,
} from "lucide-react";
import { triggerStepUpAuth, StepUpMethod } from "@/lib/api";

type Stage = "select" | "otp" | "verifying" | "success" | "failed";

const MOCK_EVENT_ID = "evt_demo_stepup";

export default function StepUpPage() {
  const [stage, setStage] = useState<Stage>("select");
  const [method, setMethod] = useState<StepUpMethod | null>(null);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const runVerification = async (chosen: StepUpMethod) => {
    setMethod(chosen);
    setStage("verifying");
    try {
      const result = await triggerStepUpAuth(MOCK_EVENT_ID, chosen);
      setStage(result.success ? "success" : "failed");
    } catch {
      setStage("failed");
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const reset = () => {
    setStage("select");
    setMethod(null);
    setOtp(["", "", "", "", "", ""]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-void flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-panel p-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-11 w-11 rounded-full bg-warning/10 border border-warning/30 flex items-center justify-center mb-3">
            <ShieldAlert size={20} className="text-warning" />
          </div>
          <h1 className="text-base font-semibold text-ink">Identity Verification Required</h1>
          <p className="text-xs text-mist mt-1">
            This action was flagged for additional review (risk score: 78).
          </p>
        </div>

        {stage === "select" && (
          <div className="space-y-2.5">
            <button
              onClick={() => setStage("otp")}
              className="w-full flex items-center gap-3 rounded-lg border border-border bg-panel-2 px-4 py-3 text-left hover:border-brand/50"
            >
              <KeyRound size={18} className="text-brand" />
              <div>
                <p className="text-sm font-medium text-ink">One-Time Passcode</p>
                <p className="text-xs text-faint">Sent to your registered device</p>
              </div>
            </button>

            <button
              onClick={() => runVerification("biometric")}
              className="w-full flex items-center gap-3 rounded-lg border border-border bg-panel-2 px-4 py-3 text-left hover:border-brand/50"
            >
              <Fingerprint size={18} className="text-brand" />
              <div>
                <p className="text-sm font-medium text-ink">Biometric (FIDO2)</p>
                <p className="text-xs text-faint">Use your device&apos;s fingerprint sensor</p>
              </div>
            </button>

            <button
              onClick={() => runVerification("liveness")}
              className="w-full flex items-center gap-3 rounded-lg border border-border bg-panel-2 px-4 py-3 text-left hover:border-brand/50"
            >
              <ScanFace size={18} className="text-brand" />
              <div>
                <p className="text-sm font-medium text-ink">Liveness Check</p>
                <p className="text-xs text-faint">Quick face scan to confirm it&apos;s you</p>
              </div>
            </button>
          </div>
        )}

        {stage === "otp" && (
          <div className="space-y-4">
            <p className="text-xs text-mist text-center">Enter the 6-digit code we sent you</p>
            <div className="flex justify-center gap-2">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  maxLength={1}
                  className="w-10 h-12 text-center text-lg font-mono rounded-md border border-border bg-void text-ink outline-none focus:border-brand"
                />
              ))}
            </div>
            <button
              disabled={otp.some((d) => d === "")}
              onClick={() => runVerification("otp")}
              className="w-full rounded-md bg-brand text-black text-sm font-medium py-2.5 disabled:opacity-40"
            >
              Verify
            </button>
            <button
              onClick={() => setStage("select")}
              className="w-full text-xs text-faint hover:text-mist"
            >
              Choose a different method
            </button>
          </div>
        )}

        {stage === "verifying" && (
          <div className="flex flex-col items-center py-8">
            <Loader2 size={28} className="text-brand animate-spin mb-3" />
            <p className="text-sm text-mist">
              {method === "biometric" && "Waiting for fingerprint scan…"}
              {method === "liveness" && "Analyzing face scan…"}
              {method === "otp" && "Verifying code…"}
            </p>
          </div>
        )}

        {stage === "success" && (
          <div className="flex flex-col items-center py-6 text-center">
            <ShieldCheck size={32} className="text-success mb-3" />
            <p className="text-sm font-semibold text-ink">Identity Verified</p>
            <p className="text-xs text-mist mt-1">You may continue with your original action.</p>
          </div>
        )}

        {stage === "failed" && (
          <div className="flex flex-col items-center py-6 text-center">
            <ShieldX size={32} className="text-danger mb-3" />
            <p className="text-sm font-semibold text-ink">Verification Failed</p>
            <p className="text-xs text-mist mt-1 mb-4">We couldn&apos;t confirm your identity.</p>
            <button
              onClick={reset}
              className="rounded-md border border-border bg-panel-2 px-4 py-2 text-sm text-mist hover:text-ink"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
