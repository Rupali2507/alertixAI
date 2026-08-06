// app/dashboard/components/SubScoreBreakdown.tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { SubScores } from "@/lib/mockData";

interface SubScoreBreakdownProps {
  subScores: SubScores;
}

const LABELS: Record<keyof SubScores, string> = {
  behavioral: "Behavioral",
  deviceTrust: "Device Trust",
  kyc: "KYC / Identity",
  insiderMisuse: "Insider Misuse",
};

// Mirrors backend/orchestrator/config.py ThresholdConfig
function colorFor(value: number): string {
  if (value >= 70) return "#FF6B85"; // risk-high
  if (value >= 35) return "#F5B84D"; // risk-mid
  return "#4ADE80"; // risk-low
}

export default function SubScoreBreakdown({ subScores }: SubScoreBreakdownProps) {
  const data = (Object.keys(subScores) as (keyof SubScores)[]).map((key) => ({
    name: LABELS[key],
    score: subScores[key],
  }));

  return (
    <div>
      <h3 className="text-sm font-medium text-mist mb-3 tracking-label text-[11px]">
        Sub-score Breakdown
      </h3>
      <div style={{ width: "100%", height: 200 }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              type="category"
              dataKey="name"
              width={100}
              tick={{ fontSize: 12, fill: "#9B98AC" }}
              axisLine={{ stroke: "#232330" }}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: any) => [`${value}`, "Score"]}
              contentStyle={{
                background: "#1A1A21",
                border: "1px solid #232330",
                borderRadius: 10,
                fontSize: 12,
                color: "#F6F5FA",
              }}
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
            />
            <Bar dataKey="score" radius={[0, 6, 6, 0]} background={{ fill: "rgba(255,255,255,0.04)" }}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={colorFor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}