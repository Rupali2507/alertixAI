// app/dashboard/components/SHAPReasonCodes.tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
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
    }));

  return (
    <div>
      <h3 className="text-sm font-semibold text-mist mb-2 tracking-wide uppercase text-xs">
        Reason Codes (SHAP)
      </h3>
      <div style={{ width: "100%", height: Math.max(160, data.length * 36) }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
            <XAxis type="number" domain={[-0.5, 0.5]} hide />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tick={{ fontSize: 11, fill: "#8892a4" }}
              axisLine={{ stroke: "#212b38" }}
              tickLine={false}
            />
            <ReferenceLine x={0} stroke="#212b38" />
            <Tooltip
              formatter={(value: number) => [
                value.toFixed(2),
                value > 0 ? "Increases risk" : "Decreases risk",
              ]}
              contentStyle={{
                background: "#131a24",
                border: "1px solid #212b38",
                borderRadius: 8,
                fontSize: 12,
                color: "#e7ecf3",
              }}
              cursor={{ fill: "#1a2230" }}
            />
            <Bar dataKey="contribution" radius={4}>
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.contribution > 0 ? "#f87171" : "#34d399"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
