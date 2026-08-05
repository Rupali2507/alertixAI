// app/dashboard/components/DeviceGraphView.tsx
"use client";

import { DeviceGraph } from "@/lib/mockData";

interface DeviceGraphViewProps {
  graph: DeviceGraph;
}

// Simple fixed 3-column layout (user -> device -> ip). Good enough for the
// mock/demo stage; if Muskan's device-graph output needs more than 3 nodes
// per case, swap this for a force layout (e.g. d3-force) in Phase 2.
const COLUMN_X: Record<string, number> = { user: 40, device: 180, ip: 320 };

export default function DeviceGraphView({ graph }: DeviceGraphViewProps) {
  const grouped: Record<string, typeof graph.nodes> = { user: [], device: [], ip: [] };
  graph.nodes.forEach((n) => grouped[n.kind]?.push(n));

  const positions = new Map<string, { x: number; y: number }>();
  (Object.keys(grouped) as (keyof typeof grouped)[]).forEach((kind) => {
    grouped[kind].forEach((node, i) => {
      positions.set(node.id, { x: COLUMN_X[kind], y: 40 + i * 60 });
    });
  });

  return (
    <div>
      <h3 className="text-sm font-semibold text-mist mb-2 tracking-wide uppercase text-xs">
        Device / IP Trust Graph
      </h3>
      <svg
        viewBox="0 0 380 160"
        className="w-full h-40 bg-panel rounded-lg border border-border"
      >
        {graph.edges.map((edge, i) => {
          const from = positions.get(edge.source);
          const to = positions.get(edge.target);
          if (!from || !to) return null;
          return (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#212b38"
              strokeWidth={Math.max(1, edge.weight * 3)}
            />
          );
        })}

        {graph.nodes.map((node) => {
          const pos = positions.get(node.id);
          if (!pos) return null;
          return (
            <g key={node.id}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={14}
                fill={node.suspicious ? "#f8717126" : "#1a2230"}
                stroke={node.suspicious ? "#f87171" : "#38bdf8"}
                strokeWidth={2}
              />
              <text
                x={pos.x}
                y={pos.y + 28}
                textAnchor="middle"
                fontSize={9}
                fontFamily="var(--font-mono)"
                fill="#8892a4"
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
