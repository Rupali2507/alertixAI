// app/system-health/components/KafkaStreamCard.tsx
"use client";

import { Waves } from "lucide-react";
import { KafkaStreamStatus } from "@/lib/mockData";

interface KafkaStreamCardProps {
  status: KafkaStreamStatus;
}

function Stat({ label, value, unit, barPct }: { label: string; value: string; unit?: string; barPct: number }) {
  return (
    <div className="rounded-lg bg-void border border-border p-4">
      <p className="text-xs text-faint uppercase tracking-wide mb-2">{label}</p>
      <p className="text-2xl font-bold font-mono text-ink">
        {value} {unit && <span className="text-sm text-mist font-normal">{unit}</span>}
      </p>
      <div className="h-1 rounded-full bg-panel-2 overflow-hidden mt-3">
        <div className="h-full bg-brand" style={{ width: `${barPct}%` }} />
      </div>
    </div>
  );
}

export default function KafkaStreamCard({ status }: KafkaStreamCardProps) {
  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-brand-dim flex items-center justify-center">
            <Waves size={16} className="text-brand" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink">Kafka Stream Status</h2>
            <p className="text-xs text-mist font-mono">
              Zookeeper: {status.zookeeperPort} &nbsp; Brokers: {status.brokerPort}
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold rounded-full bg-success/10 text-success border border-success/30 px-3 py-1">
          HEALTHY
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Throughput" value={status.throughputEps.toLocaleString()} unit="EPS" barPct={70} />
        <Stat label="Consumer Lag" value={String(status.consumerLagMsgs)} unit="msgs" barPct={20} />
        <Stat
          label="Active Partitions"
          value={`${status.activePartitions}/${status.totalPartitions}`}
          barPct={100}
        />
      </div>
    </div>
  );
}
