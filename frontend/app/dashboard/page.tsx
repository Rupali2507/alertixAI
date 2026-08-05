// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  HighRiskEvent,
  TrustLevelStats,
  StepUpAuthStats,
  AnomalyCluster,
  SubScores,
  CaseDetail,
  generateHighRiskEvents,
  generateHighRiskEvent,
  generateTrustLevelStats,
  generateStepUpAuthStats,
  generateAnomalyCluster,
  generateCaseDetail,
} from "@/lib/mockData";
import TopBar from "../components/TopBar";
import LiveFeedTicker from "./components/LiveFeedTicker";
import GlobalTrustCard from "./components/GlobalTrustCard";
import StepUpAuthCard from "./components/StepUpAuthCard";
import HighRiskEventsTable from "./components/HighRiskEventsTable";
import AnomalousOriginsCard from "./components/AnomalousOriginsCard";
import ScoreFusionCard from "./components/ScoreFusionCard";
import CaseDrillDownPanel from "./components/CaseDrillDownPanel";

const MAX_EVENTS = 8;

function averageSubScores(events: HighRiskEvent[]): SubScores {
  // Derives a rough fusion breakdown from the high-risk event signal-fusion
  // values, purely for mock display until Muskan's real fusion output lands.
  const n = events.length || 1;
  const totals = events.reduce(
    (acc, e) => {
      acc.behavioral += e.signalFusion[0] * 100;
      acc.deviceTrust += e.signalFusion[1] * 100;
      acc.kyc += e.signalFusion[2] * 100;
      return acc;
    },
    { behavioral: 0, deviceTrust: 0, kyc: 0 }
  );
  return {
    behavioral: Math.round(totals.behavioral / n),
    deviceTrust: Math.round(totals.deviceTrust / n),
    kyc: Math.round(totals.kyc / n),
    insiderMisuse: 0,
  };
}

export default function ThreatMonitorPage() {
  const [events, setEvents] = useState<HighRiskEvent[]>([]);
  const [trust, setTrust] = useState<TrustLevelStats | null>(null);
  const [stepUp, setStepUp] = useState<StepUpAuthStats | null>(null);
  const [cluster, setCluster] = useState<AnomalyCluster | null>(null);
  const [selectedCase, setSelectedCase] = useState<CaseDetail | null>(null);

  useEffect(() => {
    setEvents(generateHighRiskEvents(MAX_EVENTS));
    setTrust(generateTrustLevelStats());
    setStepUp(generateStepUpAuthStats());
    setCluster(generateAnomalyCluster());

    let i = 1000;
    const timer = setInterval(() => {
      setEvents((prev) =>
        [generateHighRiskEvent(i++), ...prev]
          .sort((a, b) => b.score - a.score)
          .slice(0, MAX_EVENTS)
      );
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  if (!trust || !stepUp || !cluster) {
    return (
      <div className="min-h-screen flex items-center justify-center text-faint text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <TopBar />
      <LiveFeedTicker events={events} />

      <main className="p-6 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 items-start">
          <div className="space-y-4">
            <GlobalTrustCard stats={trust} />
            <StepUpAuthCard stats={stepUp} />
          </div>
          <HighRiskEventsTable
            events={events}
            onRowClick={(event) => setSelectedCase(generateCaseDetail(event))}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
          <AnomalousOriginsCard cluster={cluster} />
          <ScoreFusionCard subScores={averageSubScores(events)} />
        </div>
      </main>

      <CaseDrillDownPanel detail={selectedCase} onClose={() => setSelectedCase(null)} />
    </div>
  );
}
