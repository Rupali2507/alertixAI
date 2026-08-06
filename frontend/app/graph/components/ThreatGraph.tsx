// app/graph/components/ThreatGraph.tsx
"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import { RefreshCw, AlertTriangle, Radar } from "lucide-react";
import NodeDetailPanel, { GraphNode, GraphEdge } from "./NodeDetailPanel";

const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
});

const ORCHESTRATOR_BASE_URL =
  process.env.NEXT_PUBLIC_ORCHESTRATOR_URL ?? "http://localhost:8000";
const REFRESH_MS = 30000; // full rebuild is O(events) server-side — don't hammer it

interface GraphPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
  fanout_threshold: number;
  event_count: number;
}

const TYPE_COLOR = { 
  user: "#818CF8", // Premium Indigo
  device: "#2DD4BF", // Premium Teal
  ip: "#FBBF24" // Premium Amber
};
const SUSPICIOUS_COLOR = "#F43F5E"; // Premium Rose/Crimson

const LEGEND_ITEMS = [
  { color: TYPE_COLOR.user, label: "User" },
  { color: TYPE_COLOR.device, label: "Device" },
  { color: TYPE_COLOR.ip, label: "IP origin" },
];

export default function ThreatGraph() {
  const [payload, setPayload] = useState<GraphPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const fgRef = useRef<any>(null);

  const fetchGraph = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${ORCHESTRATOR_BASE_URL}/graph/identity`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? `Failed to load graph: ${res.status}`);
      }
      const data: GraphPayload = await res.json();
      setPayload(data);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Failed to load identity graph");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchGraph();
    const t = setInterval(fetchGraph, REFRESH_MS);
    return () => clearInterval(t);
  }, [fetchGraph]);

  const nodesById = useMemo(() => {
    const m = new Map<string, GraphNode>();
    payload?.nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [payload]);

  const graphData = useMemo(() => {
    if (!payload) return { nodes: [], links: [] };
    return {
      nodes: payload.nodes.map((n) => ({ ...n })),
      links: payload.edges.map((e) => ({
        source: e.source,
        target: e.target,
        value: e.weight,
      })),
    };
  }, [payload]);

  const handleClick = useCallback((node: any) => {
    setSelectedId(node.id);
    const distance = 40;
    const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
    fgRef.current?.cameraPosition(
      { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
      node,
      1500,
    );
  }, []);

  const focusOn = useCallback(
    (id: string) => {
      const node = (graphData.nodes as any[]).find((n) => n.id === id);
      if (node) handleClick(node);
      else setSelectedId(id);
    },
    [graphData, handleClick],
  );

  const suspiciousCount =
    payload?.nodes.filter((n) => n.suspicious).length ?? 0;

  return (
    <div className="flex-1 w-full h-full min-h-0 flex flex-col bg-void relative">
      {/* ── Console bar — title, live stats, and refresh unified in one strip ── */}
      <div className="relative z-30 flex flex-col gap-4 border-b border-border bg-panel/80 backdrop-blur-md px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Radar size={13} className="text-brand" />
            <p className="tracking-label text-[10px] text-brand">
              identity graph
            </p>
          </div>
          <h1 className="text-xl font-medium text-ink tracking-tight">
            Identity Trust Graph
          </h1>
          <p className="text-mist text-sm mt-1 max-w-md">
            Real user–device–IP topology from the feature store. Click any node
            to inspect it.
          </p>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="hidden sm:flex items-center gap-5 rounded-xl glass-card px-4 py-2.5">
            <Stat label="events" value={payload?.event_count} />
            <div className="h-6 w-px bg-border" />
            <Stat label="nodes" value={payload?.nodes.length} />
            <div className="h-6 w-px bg-border" />
            <Stat
              label="flagged"
              value={payload ? suspiciousCount : undefined}
              tone="danger"
            />
          </div>
          <button
            onClick={fetchGraph}
            className="flex items-center gap-1.5 rounded-lg glass-card px-3.5 py-2.5 text-xs font-medium text-mist hover:text-ink transition-colors"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Canvas ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative overflow-hidden cursor-crosshair">
        <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand/[0.10] via-void to-void" />
        <CornerBrackets />

        {error && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 text-center px-6">
            <AlertTriangle className="text-warning" size={28} />
            <p className="text-sm text-mist max-w-md">{error}</p>
            <button
              onClick={fetchGraph}
              className="flex items-center gap-1.5 rounded-lg glass-card px-3.5 py-2 text-sm text-mist hover:text-ink"
            >
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        )}

        {!error && !payload && (
          <div className="absolute inset-0 z-20 flex items-center justify-center text-mist font-mono text-sm animate-pulse">
            Loading identity graph…
          </div>
        )}

        {!error && payload && payload.nodes.length === 0 && (
          <div className="absolute inset-0 z-20 flex items-center justify-center text-mist text-sm px-6 text-center">
            No events in the feature store yet — run{" "}
            <code className="text-brand mx-1">scripts/seed_and_train.py</code>{" "}
            or start the live feed.
          </div>
        )}

        {payload && payload.nodes.length > 0 && (
          <>
            <div className="absolute inset-0 z-10">
              <ForceGraph3D
                ref={fgRef}
                graphData={graphData}
                nodeLabel={(n: any) =>
                  `${n.type}: ${n.label}${n.suspicious ? " ⚠ flagged" : ""}`
                }
                nodeRelSize={4}
                nodeResolution={16}
                nodeThreeObject={(node: any) => {
                  const color = node.suspicious
                    ? SUSPICIOUS_COLOR
                    : TYPE_COLOR[node.type as keyof typeof TYPE_COLOR];
                  const size =
                    node.type === "user"
                      ? 2.5
                      : node.type === "device"
                        ? 1.5
                        : 1.0;
                  
                  const material = new THREE.MeshBasicMaterial({
                    color: color,
                    transparent: true,
                    opacity: node.suspicious ? 1.0 : 0.8,
                  });
                  
                  const spriteMaterial = new THREE.SpriteMaterial({
                    map: new THREE.TextureLoader().load('/glow.png'), 
                    color: color,
                    transparent: true,
                    opacity: node.suspicious ? 0.6 : 0.2,
                    blending: THREE.AdditiveBlending
                  });
                  const sprite = new THREE.Sprite(spriteMaterial);
                  sprite.scale.set(size * 4, size * 4, 1);
                  
                  const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 16), material);
                  mesh.add(sprite); 
                  
                  return mesh;
                }}
                linkWidth={(l: any) => Math.min(0.2 + l.value * 0.1, 0.8)}
                linkOpacity={0.12}
                linkColor={() => "#ffffff15"} // Uniform, faint, elegant edges. Never red.
                linkDirectionalParticles={1}
                linkDirectionalParticleWidth={1.2}
                linkDirectionalParticleSpeed={0.003}
                linkDirectionalParticleColor={(link: any) => {
                   const sNode = typeof link.source === 'object' ? link.source : nodesById.get(link.source);
                   // Data particles take the color of their source node for a beautiful fiber-optic look
                   if (sNode?.suspicious) return SUSPICIOUS_COLOR;
                   return sNode ? TYPE_COLOR[sNode.type as keyof typeof TYPE_COLOR] : "#ffffff";
                }}
                backgroundColor="rgba(0,0,0,0)"
                onNodeClick={handleClick}
                onEngineStop={() => {
                   if (fgRef.current) {
                     fgRef.current.d3Force('charge').strength(-400);
                     fgRef.current.d3Force('link').distance(40);
                   }
                }}
              />
            </div>

            <NodeDetailPanel
              node={selectedId ? (nodesById.get(selectedId) ?? null) : null}
              edges={payload.edges}
              nodesById={nodesById}
              fanoutThreshold={payload.fanout_threshold}
              onClose={() => setSelectedId(null)}
              onSelectNeighbor={focusOn}
            />

            {/* legend rail — compact chips, no duplicated counts (those live in the console bar) */}
            <div className="absolute bottom-6 left-6 z-20 flex items-center gap-1 rounded-full glass-card-strong px-2 py-2 pointer-events-none">
              {LEGEND_ITEMS.map((l) => (
                <span
                  key={l.label}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: l.color,
                      boxShadow: `0 0 8px ${l.color}`,
                    }}
                  />
                  <span className="text-[11px] font-medium text-white/70">
                    {l.label}
                  </span>
                </span>
              ))}
              <div className="h-4 w-px bg-white/10 mx-1" />
              <span className="flex items-center gap-1.5 rounded-full px-3 py-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: SUSPICIOUS_COLOR,
                    boxShadow: `0 0 8px ${SUSPICIOUS_COLOR}`,
                  }}
                />
                <span className="text-[11px] font-medium text-white/70">
                  Fan-out {"> "}
                  {payload.fanout_threshold}
                </span>
              </span>
            </div>

            {!selectedId && (
              <div className="absolute bottom-6 right-6 z-20 text-[10px] text-white/30 font-mono pointer-events-none">
                left-click rotate · scroll zoom · right-click pan
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value?: number;
  tone?: "danger";
}) {
  return (
    <div className="text-center leading-tight">
      <p
        className={`text-sm font-medium tabular-nums ${tone === "danger" && (value ?? 0) > 0 ? "text-danger" : "text-ink"}`}
      >
        {value ?? "—"}
      </p>
      <p className="text-[9px] text-faint tracking-label mt-0.5">{label}</p>
    </div>
  );
}

function CornerBrackets() {
  const common = "absolute w-6 h-6 border-brand/25 z-20 pointer-events-none";
  return (
    <>
      <span className={`${common} top-4 left-4 border-t border-l`} />
      <span className={`${common} top-4 right-4 border-t border-r`} />
      <span className={`${common} bottom-4 left-4 border-b border-l`} />
      <span className={`${common} bottom-4 right-4 border-b border-r`} />
    </>
  );
}

function RadarRings() {
  return (
    <div
      className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center opacity-[0.25]"
      style={{ animation: "spin-slow 90s linear infinite" }}
    >
      <svg viewBox="0 0 600 600" className="w-[140%] h-[140%] max-w-none">
        <defs>
          <radialGradient id="ringFade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8B7CFF" stopOpacity="0" />
            <stop offset="100%" stopColor="#8B7CFF" stopOpacity="0.5" />
          </radialGradient>
        </defs>
        {[90, 170, 250].map((r) => (
          <circle
            key={r}
            cx="300"
            cy="300"
            r={r}
            fill="none"
            stroke="url(#ringFade)"
            strokeWidth="1"
          />
        ))}
        <line
          x1="300"
          y1="300"
          x2="300"
          y2="50"
          stroke="#8B7CFF"
          strokeOpacity="0.35"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
