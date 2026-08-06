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

function colorFor(value: number): string {
  if (value >= 75) return "#f87171"; // risk-high
  if (value >= 40) return "#fbbf24"; // risk-mid
  return "#34d399"; // risk-low
}

export default function SubScoreBreakdown({ subScores }: SubScoreBreakdownProps) {
  const data = (Object.keys(subScores) as (keyof SubScores)[]).map((key) => ({
    name: LABELS[key],
    score: subScores[key],
  }));

  return (
    <div>
      <h3 className="text-sm font-semibold text-mist mb-2 tracking-wide uppercase text-xs">
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
              tick={{ fontSize: 12, fill: "#8892a4" }}
              axisLine={{ stroke: "#212b38" }}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: any) => [`${value}`, "Score"]}
              contentStyle={{
                background: "#131a24",
                border: "1px solid #212b38",
                borderRadius: 8,
                fontSize: 12,
                color: "#e7ecf3",
              }}
              cursor={{ fill: "#1a2230" }}
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]} background={{ fill: "#1a2230" }}>
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
