import ThreatGraph from "./components/ThreatGraph";

export default function GraphPage() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-void">
      <ThreatGraph />
    </div>
  );
}