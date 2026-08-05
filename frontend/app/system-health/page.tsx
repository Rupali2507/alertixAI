// app/system-health/page.tsx
"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  KafkaStreamStatus,
  FastApiStatus,
  ModelInferenceStat,
  FeatureStoreStats,
  ContainerStatusRow,
  generateKafkaStreamStatus,
  generateFastApiStatus,
  generateModelInferenceStats,
  generateFeatureStoreStats,
  generateContainerStatus,
} from "@/lib/mockData";
import TopBar from "../components/TopBar";
import KafkaStreamCard from "./components/KafkaStreamCard";
import FastApiCard from "./components/FastApiCard";
import ModelInferenceCard from "./components/ModelInferenceCard";
import FeatureStoreCard from "./components/FeatureStoreCard";
import ContainerStatusTable from "./components/ContainerStatusTable";

export default function SystemHealthPage() {
  const [kafka, setKafka] = useState<KafkaStreamStatus | null>(null);
  const [fastApi, setFastApi] = useState<FastApiStatus | null>(null);
  const [models, setModels] = useState<ModelInferenceStat[]>([]);
  const [featureStore, setFeatureStore] = useState<FeatureStoreStats | null>(null);
  const [containers, setContainers] = useState<ContainerStatusRow[]>([]);

  const refresh = () => {
    setKafka(generateKafkaStreamStatus());
    setFastApi(generateFastApiStatus());
    setModels(generateModelInferenceStats());
    setFeatureStore(generateFeatureStoreStats());
    setContainers(generateContainerStatus());
  };

  useEffect(refresh, []);

  if (!kafka || !fastApi || !featureStore) {
    return (
      <div className="min-h-screen flex items-center justify-center text-faint text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar title="" />

      <main className="p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Infrastructure Telemetry</h1>
            <p className="text-sm text-mist mt-1">
              Real-time health and performance metrics across the data plane.
            </p>
          </div>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 rounded-md border border-border bg-panel-2 px-3.5 py-2 text-sm text-mist hover:text-ink"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">
          <KafkaStreamCard status={kafka} />
          <FastApiCard status={fastApi} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <ModelInferenceCard stats={models} />
          <FeatureStoreCard stats={featureStore} />
        </div>

        <ContainerStatusTable rows={containers} />
      </main>
    </div>
  );
}
