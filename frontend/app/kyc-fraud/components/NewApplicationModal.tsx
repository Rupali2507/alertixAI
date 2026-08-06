// app/kyc-fraud/components/NewApplicationModal.tsx
"use client";

import { useState } from "react";
import { X, FileCheck } from "lucide-react";
import { ApplicationInput } from "@/lib/kycFraudData";

interface Props {
  onClose: () => void;
  onSubmit: (input: ApplicationInput) => void;
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
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = FIELD_META.filter((f) => f.required).every((f) => (form[f.key] ?? "").trim().length > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setTimeout(() => {
      onSubmit({
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        deviceId: form.deviceId.trim(),
        ipAddress: form.ipAddress.trim(),
        faceRef: form.faceRef.trim(),
        bankAccount: form.bankAccount?.trim() || undefined,
      });
      setSubmitting(false);
    }, 550);
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

        <div className="p-6 space-y-5">
          <p className="text-xs text-mist leading-relaxed">
            Enter the applicant&apos;s declared details along with the device, IP, and face-scan reference
            captured during their onboarding session. These get checked against the identity graph.
          </p>

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
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand text-black text-sm font-medium py-3 hover:bg-brand/90 disabled:opacity-40 transition-colors mt-2"
          >
            <FileCheck size={15} />
            {submitting ? "Checking identity graph…" : "Submit for verification"}
          </button>
        </div>
      </div>
    </>
  );
}