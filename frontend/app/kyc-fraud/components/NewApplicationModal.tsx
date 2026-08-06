"use client";

import { useState } from "react";
import { X, FileCheck, Sparkles, ChevronDown } from "lucide-react";
import { ApplicationInput, KYC_DEMO_SCENARIOS, submitToIdentityGraphService, KycApplicant, DemoScenario } from "@/lib/kycFraudData";

interface Props {
  onClose: () => void;
  onSubmit: (applicant: KycApplicant) => void; // now receives the resolved applicant
}

const FIELD_META: { key: keyof ApplicationInput; label: string; placeholder: string; required: boolean }[] = [
  { key: "name", label: "Full name", placeholder: "As on submitted ID", required: true },
  { key: "phone", label: "Phone number", placeholder: "9XXXXXXXXX", required: true },
  { key: "address", label: "Address", placeholder: "Street, city", required: true },
  { key: "deviceId", label: "Device ID", placeholder: "Captured from onboarding session", required: true },
  { key: "ipAddress", label: "IP address", placeholder: "Captured from onboarding session", required: true },
  { key: "faceRef", label: "Face scan reference", placeholder: "From liveness capture", required: true },
  { key: "bankAccount", label: "Linked bank account (optional)", placeholder: "If provided at onboarding", required: false },
];

export default function NewApplicationModal({ onClose, onSubmit }: Props) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [manualOpen, setManualOpen] = useState(false);
  const [stage, setStage] = useState<string | null>(null);

  const canSubmitManual = FIELD_META.filter((f) => f.required).every((f) => (form[f.key] ?? "").trim().length > 0);

  const runScenario = async (s: DemoScenario & { burstPattern: boolean }) => {
    setStage("Verifying document authenticity…");
    const applicant = await submitToIdentityGraphService(s.build(), "manual_submission", s.burstPattern, setStage);
    setStage(null);
    onSubmit(applicant);
  };

  const handleManualSubmit = async () => {
    if (!canSubmitManual) return;
    setStage("Verifying document authenticity…");
    const applicant = await submitToIdentityGraphService(
      {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        deviceId: form.deviceId.trim(),
        ipAddress: form.ipAddress.trim(),
        faceRef: form.faceRef.trim(),
        bankAccount: form.bankAccount?.trim() || undefined,
      },
      "manual_submission",
      false,
      setStage
    );
    setStage(null);
    onSubmit(applicant);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-md glass-card-strong border-l border-border z-50 overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-panel/90 backdrop-blur-md z-10">
          <div>
            <p className="text-[10px] text-faint tracking-label mb-1">Onboarding</p>
            <h2 className="text-lg font-medium text-ink">New Application</h2>
          </div>
          <button onClick={onClose} className="text-mist hover:text-ink glass-card p-2 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {stage ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="h-8 w-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
              <p className="text-sm text-mist font-mono">{stage}</p>
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={14} className="text-brand" />
                  <p className="text-sm font-medium text-ink">Run intake scenario</p>
                </div>
                <p className="text-xs text-mist leading-relaxed mb-4">
                  Simulates a captured onboarding session (device, IP, and face-scan reference)
                  being checked against the identity graph.
                </p>
                <div className="space-y-2">
                  {KYC_DEMO_SCENARIOS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => runScenario(s)}
                      className="w-full text-left rounded-lg border border-border bg-void px-4 py-3 hover:border-brand/50 transition-colors"
                    >
                      <p className="text-sm font-medium text-ink">{s.label}</p>
                      <p className="text-xs text-mist mt-0.5">{s.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <button
                  onClick={() => setManualOpen((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-mist hover:text-ink"
                >
                  <ChevronDown size={13} className={`transition-transform ${manualOpen ? "rotate-180" : ""}`} />
                  Manual analyst entry
                </button>

                {manualOpen && (
                  <div className="space-y-4 mt-4">
                    {FIELD_META.map((f) => (
                      <div key={f.key}>
                        <label className="text-xs text-mist mb-1.5 block">
                          {f.label}
                          {f.required && <span className="text-danger ml-0.5">*</span>}
                        </label>
                        <input
                          value={form[f.key] ?? ""}
                          onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className="w-full rounded-lg border border-border bg-void px-3.5 py-2.5 text-sm text-ink placeholder:text-faint outline-none focus:border-brand transition-colors"
                        />
                      </div>
                    ))}
                    <button
                      onClick={handleManualSubmit}
                      disabled={!canSubmitManual}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand text-black text-sm font-medium py-3 hover:bg-brand/90 disabled:opacity-40 transition-colors"
                    >
                      <FileCheck size={15} />
                      Submit for verification
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}