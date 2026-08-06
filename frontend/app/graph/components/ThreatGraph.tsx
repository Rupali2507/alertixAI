"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
// Dynamically import ForceGraph3D to avoid SSR issues with window/document
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false });
import * as THREE from "three";

interface GraphData {
  nodes: { id: string; group: number; val: number; name: string }[];
  links: { source: string; target: string; value: number }[];
}

export default function ThreatGraph() {
  const [data, setData] = useState<GraphData | null>(null);
  const fgRef = useRef<any>(null);

  useEffect(() => {
    // Generate a mock dense graph that looks impressive for the GNN visualization
    const gData: GraphData = { nodes: [], links: [] };
    const nodeCount = 150;
    
    // 0: User (Neon Cyan), 1: Device (Purple), 2: IP (Amber)
    for (let i = 0; i < nodeCount; i++) {
      const group = i % 10 === 0 ? 0 : i % 3 === 0 ? 1 : 2;
      gData.nodes.push({
        id: `id${i}`,
        group,
        val: group === 0 ? 5 : group === 1 ? 3 : 2, // Size based on type
        name: group === 0 ? `User_${i}` : group === 1 ? `Device_hash_${i}` : `IP_192.168.1.${i}`
      });
    }

    // Connect them (create some dense clusters to simulate fraud rings)
    for (let i = 0; i < nodeCount * 1.5; i++) {
      const source = `id${Math.floor(Math.random() * (nodeCount / 2))}`;
      const target = `id${Math.floor(Math.random() * nodeCount)}`;
      gData.links.push({ source, target, value: 1 });
    }
    
    // Add a specific highly connected fraud ring
    for(let i = 0; i < 15; i++) {
        gData.links.push({ source: 'id0', target: `id${130 + i}`, value: 2 });
    }

    setData(gData);
  }, []);

  const handleClick = useCallback((node: any) => {
    // Aim at node from outside it
    const distance = 40;
    const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
    
    fgRef.current?.cameraPosition(
      { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
      node, // lookAt ({ x, y, z })
      3000  // ms transition duration
    );
  }, [fgRef]);

  if (!data) return <div className="flex-1 flex items-center justify-center text-mist font-mono animate-pulse">Initializing WebGL Neural Matrix...</div>;

  return (
    <div className="flex-1 w-full relative overflow-hidden bg-void cursor-crosshair">
      {/* Dynamic ambient background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand/10 via-void to-void z-0 pointer-events-none"></div>

      <ForceGraph3D
        ref={fgRef}
        graphData={data}
        nodeLabel="name"
        nodeRelSize={6}
        nodeResolution={32}
        
        // Custom Node Material for a glassy/glowing aesthetic
        nodeThreeObject={(node: any) => {
          const color = node.group === 0 ? "#00f0ff" : node.group === 1 ? "#b026ff" : "#ffb400";
          const size = node.group === 0 ? 6 : node.group === 1 ? 4 : 3;
          
          return new THREE.Mesh(
            new THREE.SphereGeometry(size, 32, 32),
            new THREE.MeshPhysicalMaterial({
              color: color,
              emissive: color,
              emissiveIntensity: 0.5,
              roughness: 0.2,
              metalness: 0.8,
              transparent: true,
              opacity: 0.9,
              clearcoat: 1.0,
              clearcoatRoughness: 0.1
            })
          );
        }}

        // Thin, elegant edges
        linkWidth={0.5}
        linkOpacity={0.15}
        linkColor={() => "rgba(255, 255, 255, 1)"}
        
        // Flowing data particles! (This makes it look incredibly high-tech)
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleColor={(link: any) => {
            const sourceNode = typeof link.source === 'object' ? link.source : data.nodes.find(n => n.id === link.source);
            return sourceNode?.group === 0 ? "#00f0ff" : sourceNode?.group === 1 ? "#b026ff" : "#ffb400";
        }}

        backgroundColor="rgba(0,0,0,0)" // Transparent to let CSS gradient show
        onNodeClick={handleClick}
      />
      
      {/* Legend overlay */}
      <div className="absolute bottom-8 left-8 p-5 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl pointer-events-none z-10">
        <h3 className="text-xs font-bold text-white/80 mb-4 uppercase tracking-[0.2em]">Neural Graph Legend</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00f0ff] shadow-[0_0_12px_#00f0ff]" />
            <span className="text-sm font-medium text-white/70">User Entity</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#b026ff] shadow-[0_0_12px_#b026ff]" />
            <span className="text-sm font-medium text-white/70">Device Fingerprint</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffb400] shadow-[0_0_12px_#ffb400]" />
            <span className="text-sm font-medium text-white/70">IP Origin</span>
          </div>
        </div>
      </div>
      
      {/* Interaction hint overlay */}
      <div className="absolute bottom-8 right-8 px-4 py-2 rounded-full border border-white/10 bg-black/40 backdrop-blur-xl pointer-events-none z-10">
        <p className="text-[10px] text-white/50 font-mono tracking-widest uppercase">Click Node to Focus • Scroll to Zoom</p>
      </div>
    </div>
  );
}
