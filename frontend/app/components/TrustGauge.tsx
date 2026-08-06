"use client";

import { useId } from "react";

interface TrustGaugeProps {
  /** Risk score in [0, 1], higher = riskier — same convention as DetectorScore.score */
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  showValue?: boolean;
  animated?: boolean;
}

// Mirrors backend/orchestrator/config.py ThresholdConfig — keep in sync if thresholds change
const ALLOW_MAX = 0.35;
const STEP_UP_MAX = 0.70;

function gaugeColors(score: number): { from: string; to: string; text: string } {
  if (score < ALLOW_MAX) return { from: "#6EE7A8", to: "#22C55E", text: "#4ADE80" };
  if (score < STEP_UP_MAX) return { from: "#FBBF24", to: "#F59E0B", text: "#F5B84D" };
  return { from: "#FF8FA3", to: "#E8385A", text: "#FF6B85" };
}

export default function TrustGauge({
  score,
  size = 140,
  strokeWidth = 11,
  label,
  showValue = true,
  animated = true,
}: TrustGaugeProps) {
  const id = useId().replace(/:/g, "");
  const clamped = Math.max(0, Math.min(1, score));
  const trustPct = Math.round((1 - clamped) * 100); // display as trust, not raw risk

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped * 0.78); // 0.78 caps the arc sweep for visual balance

  const colors = gaugeColors(clamped);

  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#gauge-grad-${id})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={
            animated
              ? {
                  ["--gauge-circumference" as string]: circumference,
                  animation: "gauge-fill 1.1s cubic-bezier(0.16,1,0.3,1) both",
                }
              : undefined
          }
        />
        <defs>
          <linearGradient id={`gauge-grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.from} />
            <stop offset="100%" stopColor={colors.to} />
          </linearGradient>
        </defs>
      </svg>
      {showValue && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: size * 0.24, fontWeight: 500, color: "#F6F5FA", letterSpacing: "-0.02em" }}>
            {trustPct}
            <span style={{ fontSize: size * 0.12, color: "rgba(246,245,250,0.4)" }}>%</span>
          </span>
          {label && (
            <span style={{ fontSize: size * 0.075, color: colors.text, letterSpacing: "0.04em", marginTop: 2 }}>
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}