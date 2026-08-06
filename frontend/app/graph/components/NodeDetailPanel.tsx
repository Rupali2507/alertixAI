// app/graph/components/NodeDetailPanel.tsx
"use client";

import { X, User, Laptop2, Globe2, AlertTriangle } from "lucide-react";

export interface GraphNode {
  id: string;
  type: "user" | "device" | "ip";
  label: string;
  degree: number;
  suspicious: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  relation: string;
}

interface NeighborRow {
  node: GraphNode;
  weight: number;
  relation: string;
}

const TYPE_ICON = { user: User, device: Laptop2, ip: Globe2 };
const TYPE_LABEL = { user: "User", device: "Device", ip: "IP Address" };

function neighborsOf(nodeId: string, edges: GraphEdge[], nodesById: Map<string, GraphNode>): NeighborRow[] {
  const rows: NeighborRow[] = [];
  for (const e of edges) {
    if (e.source === nodeId) {
      const n = nodesById.get(e.target);
      if (n) rows.push({ node: n, weight: e.weight, relation: e.relation });
    } else if (e.target === nodeId) {
      const n = nodesById.get(e.source);
      if (n) rows.push({ node: n, weight: e.weight, relation: e.relation });
    }
  }
  return rows.sort((a, b) => b.weight - a.weight).slice(0, 8);
}

interface NodeDetailPanelProps {
  node: GraphNode | null;
  edges: GraphEdge[];
  nodesById: Map<string, GraphNode>;
  fanoutThreshold: number;
  onClose: () => void;
  onSelectNeighbor: (id: string) => void;
}

export default function NodeDetailPanel({
  node, edges, nodesById, fanoutThreshold, onClose, onSelectNeighbor,
}: NodeDetailPanelProps) {
  if (!node) return null;
  const Icon = TYPE_ICON[node.type];
  const neighbors = neighborsOf(node.id, edges, nodesById);

  return (
    <div className="absolute top-6 right-6 z-20 w-80 bg-panel/95 border border-border/80 backdrop-blur-xl rounded-2xl p-5 shadow-2xl">
      <div className="flex items-start justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${node.suspicious ? "bg-danger/15 border border-danger/30" : "bg-brand-dim border border-brand/25"}`}>
            <Icon size={16} className={node.suspicious ? "text-danger" : "text-brand"} />
          </div>
          <div>
            <p className="text-[10px] text-faint tracking-label">{TYPE_LABEL[node.type]}</p>
            <p className="text-sm font-medium text-ink font-mono truncate max-w-[160px]">{node.label}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-faint hover:text-ink p-1">
          <X size={16} />
        </button>
      </div>

      {node.suspicious && (
        <div className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/[0.06] px-3 py-2.5 mb-4 shrink-0">
          <AlertTriangle size={14} className="text-danger shrink-0 mt-0.5" />
          <p className="text-[11px] text-danger leading-relaxed">
            Fan-out signature: connected to {node.degree} distinct entities, above the
            {" "}{fanoutThreshold}-connection guardrail device_trust uses to flag device/SIM farms.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-5 shrink-0">
        <div className="bg-panel-2/80 border border-border/50 rounded-xl px-3 py-2.5">
          <p className="text-[10px] text-faint mb-1 uppercase tracking-widest font-semibold">Degree</p>
          <p className="text-lg font-bold text-ink tabular-nums">{node.degree}</p>
        </div>
        <div className="bg-panel-2/80 border border-border/50 rounded-xl px-3 py-2.5">
          <p className="text-[10px] text-faint mb-1 uppercase tracking-widest font-semibold">Status</p>
          <p className={`text-sm font-medium ${node.suspicious ? "text-danger" : "text-success"}`}>
            {node.suspicious ? "Flagged" : "Normal"}
          </p>
        </div>
      </div>

      <p className="text-[11px] text-faint tracking-label mb-2 shrink-0">
        Connected entities ({neighbors.length}{neighbors.length === 8 ? "+" : ""})
      </p>
      <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto pr-1">
        {neighbors.length === 0 && (
          <p className="text-xs text-faint italic">No edges in the current window.</p>
        )}
        {neighbors.map((n) => {
          const NIcon = TYPE_ICON[n.node.type];
          return (
            <button
              key={n.node.id}
              onClick={() => onSelectNeighbor(n.node.id)}
              className="w-full flex items-center justify-between gap-2 rounded-lg bg-panel-2/50 border border-border/30 px-3 py-2 hover:border-brand/50 hover:bg-panel-2 transition-colors text-left group"
            >
              <span className="flex items-center gap-2 min-w-0">
                <NIcon size={12} className={n.node.suspicious ? "text-danger" : "text-mist group-hover:text-ink transition-colors"} />
                <span className="text-xs text-ink font-mono truncate">{n.node.label}</span>
              </span>
              <span className="text-[10px] text-faint shrink-0">×{n.weight}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}