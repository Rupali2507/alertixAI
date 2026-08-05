import ThreatGraph from "./components/ThreatGraph";

export default function GraphPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-void relative">
      <div className="absolute top-6 left-6 z-10">
        <h1 className="text-2xl font-semibold text-ink drop-shadow-lg tracking-tight">3D Identity Trust Graph</h1>
        <p className="text-mist text-sm mt-1 max-w-md drop-shadow">Interactive visualization of PyTorch Geometric GraphSAGE embeddings. Dense clusters often indicate coordinated fraud rings.</p>
      </div>
      <ThreatGraph />
    </div>
  );
}
