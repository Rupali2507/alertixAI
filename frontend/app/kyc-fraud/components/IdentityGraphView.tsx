// app/kyc-fraud/components/IdentityGraphView.tsx
"use client";

import { KycGraph, KycGraphNode } from "@/lib/kycFraudData";

const KIND_COLOR: Record<string, string> = {
  applicant: "#CAFF33",
  device: "#2DD4BF",
  ip: "#FBBF24",
  face_cluster: "#A78BFA",
  bank_account: "#FB7185",
};

const KIND_LABEL: Record<string, string> = {
  applicant: "Applicant",
  device: "Device",
  ip: "IP address",
  face_cluster: "Face match",
  bank_account: "Bank account",
};

function layout(graph: KycGraph) {
  const center = { x: 340, y: 210 };
  const ring1 = graph.nodes.filter((n) => n.hop === 1);
  const ring2 = graph.nodes.filter((n) => n.hop === 2);
  const positions = new Map<string, { x: number; y: number }>();

  const newNode = graph.nodes.find((n) => n.hop === 0);
  if (newNode) positions.set(newNode.id, center);

  ring1.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / Math.max(ring1.length, 1) - Math.PI / 2;
    positions.set(n.id, { x: center.x + Math.cos(angle) * 145, y: center.y + Math.sin(angle) * 145 });
  });

  ring2.forEach((n, i) => {
    const parentEdge = graph.edges.find((e) => e.target === n.id && (ring1.some((r) => r.id === e.source) || e.source === newNode?.id));
    const parentPos = parentEdge ? positions.get(parentEdge.source) : undefined;
    const base = parentPos ?? center;
    const dx = base.x - center.x, dy = base.y - center.y;
    const outward = Math.atan2(dy, dx) + (i % 2 === 0 ? 0.5 : -0.5);
    positions.set(n.id, {
      x: Math.max(40, Math.min(640, base.x + Math.cos(outward) * 95)),
      y: Math.max(40, Math.min(390, base.y + Math.sin(outward) * 95)),
    });
  });

  return positions;
}

function nodeRadius(node: KycGraphNode) {
  if (node.hop === 0) return 18;
  if (node.isFraudSeed) return 14;
  return 11;
}

function curvePath(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const nx = -dy * 0.12, ny = dx * 0.12;
  return `M ${x1} ${y1} Q ${mx + nx} ${my + ny} ${x2} ${y2}`;
}

export default function IdentityGraphView({ graph }: { graph: KycGraph }) {
  const positions = layout(graph);

  return (
    <div>
      <svg viewBox="0 0 680 420" className="w-full h-[400px] rounded-xl border border-border overflow-visible">
        <defs>
          <radialGradient id="bgGlow" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#151b12" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </radialGradient>
          <filter id="softGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {Object.entries(KIND_COLOR).map(([kind, color]) => (
            <radialGradient key={kind} id={`grad-${kind}`} cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor={color} stopOpacity="0.9" />
              <stop offset="100%" stopColor={color} stopOpacity="0.25" />
            </radialGradient>
          ))}
          <radialGradient id="grad-fraud" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#FF6B6B" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#FF3B30" stopOpacity="0.3" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="680" height="420" fill="url(#bgGlow)" rx="12" />
        <pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.7" fill="#ffffff08" />
        </pattern>
        <rect x="0" y="0" width="680" height="420" fill="url(#grid)" rx="12" />

        {graph.edges.map((edge, i) => {
          const from = positions.get(edge.source);
          const to = positions.get(edge.target);
          if (!from || !to) return null;
          const strokeWidth = edge.strength === "strong" ? 2.4 : edge.strength === "medium" ? 1.5 : 0.9;
          const color = edge.strength === "strong" ? "#FF6B85" : edge.strength === "medium" ? "#F5B84D" : "#4b5563";
          return (
            <path
              key={i}
              d={curvePath(from.x, from.y, to.x, to.y)}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeOpacity={edge.strength === "weak" ? 0.45 : 0.85}
              strokeLinecap="round"
              filter={edge.strength === "strong" ? "url(#softGlow)" : undefined}
            >
              <title>{edge.relation.replace(/_/g, " ")} · {edge.strength} signal</title>
            </path>
          );
        })}

        {graph.nodes.map((node) => {
          const pos = positions.get(node.id);
          if (!pos) return null;
          const r = nodeRadius(node);
          const gradId = node.isFraudSeed ? "grad-fraud" : `grad-${node.kind}`;
          const strokeColor = node.isFraudSeed ? "#FF3B30" : KIND_COLOR[node.kind];
          return (
            <g key={node.id}>
              {node.hop === 0 && (
                <circle cx={pos.x} cy={pos.y} r={r + 10} fill="none" stroke="#CAFF33" strokeOpacity={0.3} strokeWidth={1.5}>
                  <animate attributeName="r" values={`${r + 6};${r + 18};${r + 6}`} dur="2.6s" repeatCount="indefinite" />
                  <animate attributeName="stroke-opacity" values="0.4;0.05;0.4" dur="2.6s" repeatCount="indefinite" />
                </circle>
              )}
              {node.isFraudSeed && (
                <circle cx={pos.x} cy={pos.y} r={r + 7} fill="none" stroke="#FF3B30" strokeOpacity={0.35} strokeWidth={1.5}>
                  <animate attributeName="r" values={`${r + 4};${r + 12};${r + 4}`} dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="stroke-opacity" values="0.5;0.05;0.5" dur="1.8s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={pos.x} cy={pos.y} r={r} fill={`url(#${gradId})`} stroke={strokeColor} strokeWidth={node.hop === 0 ? 2.2 : 1.4} filter="url(#softGlow)">
                <title>
                  {KIND_LABEL[node.kind]}: {node.label}
                  {node.isFraudSeed ? " — confirmed fraud" : ""}
                </title>
              </circle>
              <rect
                x={pos.x - (node.label.length * 3.1 + 6)}
                y={pos.y + r + 4}
                width={node.label.length * 6.2 + 12}
                height={15}
                rx={4}
                fill="#0a0a0aee"
              />
              <text
                x={pos.x}
                y={pos.y + r + 14.5}
                textAnchor="middle"
                fontSize={9.5}
                fontFamily="var(--font-mono)"
                fill={node.isFraudSeed ? "#FF8FA3" : "#c4c4c4"}
              >
                {node.label.length > 16 ? node.label.slice(0, 15) + "…" : node.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap items-center gap-4 mt-3 px-1 text-[11px] text-mist">
        {Object.entries(KIND_LABEL).map(([kind, label]) => (
          <span key={kind} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: KIND_COLOR[kind] }} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-danger" />
          Confirmed fraud case
        </span>
      </div>
    </div>
  );
}