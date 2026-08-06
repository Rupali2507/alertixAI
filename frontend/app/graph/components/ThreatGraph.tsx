// app/graph/components/ThreatGraph.tsx
"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import { RefreshCw, AlertTriangle } from "lucide-react";
import NodeDetailPanel, { GraphNode, GraphEdge } from "./NodeDetailPanel";

const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false });

const ORCHESTRATOR_BASE_URL = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL ?? "http://localhost:8000";
const REFRESH_MS = 30000; // full rebuild is O(events) server-side — don't hammer it

interface GraphPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
  fanout_threshold: number;
  event_count: number;
}

const TYPE_COLOR = { user: "#8B7CFF", device: "#C9C1FF", ip: "#F5B84D" };
const SUSPICIOUS_COLOR = "#FF6B85";

export default function ThreatGraph() {
  const [payload, setPayload] = useState<GraphPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fgRef = useRef<any>(null);

  const fetchGraph = useCallback(async () => {
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
      links: payload.edges.map((e) => ({ source: e.source, target: e.target, value: e.weight })),
    };
  }, [payload]);

  const handleClick = useCallback((node: any) => {
    setSelectedId(node.id);
    const distance = 40;
    const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
    fgRef.current?.cameraPosition(
      { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
      node,
      1500
    );
  }, []);

  const focusOn = useCallback((id: string) => {
    const node = (graphData.nodes as any[]).find((n) => n.id === id);
    if (node) handleClick(node);
    else setSelectedId(id);
  }, [graphData, handleClick]);

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
        <AlertTriangle className="text-warning" size={28} />
        <p className="text-sm text-mist max-w-md">{error}</p>
        <button
          onClick={fetchGraph}
          className="flex items-center gap-1.5 rounded-lg glass-card px-3.5 py-2 text-sm text-mist hover:text-ink"
        >
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="flex-1 flex items-center justify-center text-mist font-mono animate-pulse">
        Loading identity graph…
      </div>
    );
  }

  if (payload.nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-mist text-sm">
        No events in the feature store yet — run <code className="text-brand mx-1">scripts/seed_and_train.py</code> or start the live feed.
      </div>
    );
  }

  const selectedNode = selectedId ? nodesById.get(selectedId) ?? null : null;
  const suspiciousCount = payload.nodes.filter((n) => n.suspicious).length;

  return (
    <div className="flex-1 w-full relative overflow-hidden bg-void cursor-crosshair">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand/10 via-void to-void z-0 pointer-events-none" />

      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeLabel={(n: any) => `${n.type}: ${n.label}${n.suspicious ? " ⚠ flagged" : ""}`}
        nodeRelSize={6}
        nodeResolution={32}
        nodeThreeObject={(node: any) => {
          const color = node.suspicious ? SUSPICIOUS_COLOR : TYPE_COLOR[node.type as keyof typeof TYPE_COLOR];
          const size = node.type === "user" ? 5.5 : node.type === "device" ? 4 : 3;
          return new THREE.Mesh(
            new THREE.SphereGeometry(size, 32, 32),
            new THREE.MeshPhysicalMaterial({
              color, emissive: color, emissiveIntensity: node.suspicious ? 0.85 : 0.45,
              roughness: 0.2, metalness: 0.8, transparent: true, opacity: 0.92,
              clearcoat: 1.0, clearcoatRoughness: 0.1,
            })
          );
        }}
        linkWidth={(l: any) => Math.min(0.4 + l.value * 0.15, 2.5)}
        linkOpacity={0.18}
        linkColor={() => "rgba(255, 255, 255, 1)"}
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={1.4}
        linkDirectionalParticleSpeed={0.004}
        backgroundColor="rgba(0,0,0,0)"
        onNodeClick={handleClick}
      />

      <NodeDetailPanel
        node={selectedNode}
        edges={payload.edges}
        nodesById={nodesById}
        fanoutThreshold={payload.fanout_threshold}
        onClose={() => setSelectedId(null)}
        onSelectNeighbor={focusOn}
      />

      <div className="absolute bottom-8 left-8 p-5 rounded-2xl glass-card-strong pointer-events-none z-10">
        <h3 className="text-xs font-medium text-white/80 mb-1 tracking-label">Identity Graph</h3>
        <p className="text-[10px] text-white/40 mb-4 font-mono">
          {payload.event_count} events · {payload.nodes.length} nodes · {suspiciousCount} flagged
        </p>
        <div className="space-y-3">
          {[
            { color: TYPE_COLOR.user, label: "User" },
            { color: TYPE_COLOR.device, label: "Device" },
            { color: TYPE_COLOR.ip, label: "IP Origin" },
            { color: SUSPICIOUS_COLOR, label: `Fan-out flagged (>${payload.fanout_threshold})` },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color, boxShadow: `0 0 12px ${l.color}` }} />
              <span className="text-sm font-medium text-white/70">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={fetchGraph}
        className="absolute bottom-8 right-8 flex items-center gap-1.5 px-4 py-2 rounded-full glass-card-strong pointer-events-auto z-10 text-[11px] text-white/60 hover:text-white/90 transition-colors"
      >
        <RefreshCw size={12} /> Refresh
      </button>
    </div>
  );
}