// app/dashboard/components/SHAPReasonCodes.tsx
"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { ReasonCode } from "@/lib/mockData";

interface SHAPReasonCodesProps {
  reasonCodes: ReasonCode[];
}

export default function SHAPReasonCodes({ reasonCodes }: SHAPReasonCodesProps) {
  const data = [...reasonCodes]
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .map((r) => ({
      name: r.feature.replace(/_/g, " "),
      contribution: r.contribution,
      hasWeight: r.contribution !== 0,
    }));

  if (data.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-medium text-mist mb-3 tracking-label text-[11px]">
          Why This Was Flagged
        </h3>
        <p className="text-sm text-faint">No specific reason codes for this event.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-mist mb-3 tracking-label text-[11px]">
        Why This Was Flagged
      </h3>
      <div style={{ width: "100%", height: Math.max(160, data.length * 36) }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
            <XAxis type="number" domain={[-0.5, 0.5]} hide />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tick={{ fontSize: 11, fill: "#9B98AC" }}
              axisLine={{ stroke: "#232330" }}
              tickLine={false}
            />
            <ReferenceLine x={0} stroke="#232330" />
            <Tooltip
              formatter={(value: any, _n: any, entry: any) => [
                entry.payload.hasWeight ? value.toFixed(2) : "flagged (magnitude n/a)",
                value >= 0 ? "Increases risk" : "Decreases risk",
              ]}
              contentStyle={{
                background: "#1A1A21",
                border: "1px solid #232330",
                borderRadius: 10,
                fontSize: 12,
                color: "#F6F5FA",
              }}
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
            />
            <Bar dataKey="contribution" radius={4}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.contribution > 0 ? "#FF6B85" : "#4ADE80"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}