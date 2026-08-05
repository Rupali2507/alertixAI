// app/insider-misuse/components/ThresholdControlsCard.tsx
"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { ThresholdControls } from "@/lib/mockData";

interface ThresholdControlsCardProps {
  initial: ThresholdControls;
}

export default function ThresholdControlsCard({ initial }: ThresholdControlsCardProps) {
  const [massExport, setMassExport] = useState(initial.massExportRateGbHr);
  const [kycVelocity, setKycVelocity] = useState(initial.kycOverrideVelocity);

  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink mb-5">
        <SlidersHorizontal size={16} className="text-brand" />
        Threshold Controls
      </h2>

      <div className="mb-5">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-mist">Mass Export Rate (GB/hr)</span>
          <span className="font-mono text-ink">{massExport} GB</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={5}
          step={0.1}
          value={massExport}
          onChange={(e) => setMassExport(Number(e.target.value))}
          className="w-full accent-brand"
        />
        <div className="flex justify-between text-[11px] text-faint font-mono">
          <span>0.5</span>
          <span>5.0</span>
        </div>
      </div>

      <div className="mb-5">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-mist">KYC Override Velocity</span>
          <span className="font-mono text-ink">{kycVelocity} / 10m</span>
        </div>
        <input
          type="range"
          min={5}
          max={50}
          step={1}
          value={kycVelocity}
          onChange={(e) => setKycVelocity(Number(e.target.value))}
          className="w-full accent-brand"
        />
        <div className="flex justify-between text-[11px] text-faint font-mono">
          <span>5</span>
          <span>50</span>
        </div>
      </div>

      <button className="w-full rounded-md bg-brand-dim border border-brand/40 text-brand text-sm font-medium py-2 hover:bg-brand/20">
        Apply Adjustments
      </button>
    </div>
  );
}
