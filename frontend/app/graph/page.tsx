import ThreatGraph from "./components/ThreatGraph";

export default function GraphPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-void relative">
      <div className="absolute top-6 left-6 z-10">
        <p className="tracking-label text-[11px] text-brand mb-2 drop-shadow">identity graph</p>
        <h1 className="text-2xl font-medium text-ink drop-shadow-lg tracking-tight">Identity Trust Graph</h1>
        <p className="text-mist text-sm mt-1 max-w-md drop-shadow">
          Real user–device–IP topology from the feature store. Click any node for degree, fan-out status, and connected entities.
        </p>
      </div>
      <ThreatGraph />
    </div>
  );
}