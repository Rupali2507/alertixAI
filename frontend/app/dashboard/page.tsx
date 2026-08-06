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
import WelcomeBanner from "./components/WelcomeBanner";
import LiveFeedTicker from "./components/LiveFeedTicker";
import GlobalTrustCard from "./components/GlobalTrustCard";
import StepUpAuthCard from "./components/StepUpAuthCard";
import HighRiskEventsTable from "./components/HighRiskEventsTable";
import AnomalousOriginsCard from "./components/AnomalousOriginsCard";
import ScoreFusionCard from "./components/ScoreFusionCard";
import CaseDrillDownPanel from "./components/CaseDrillDownPanel";
import SimulatorButtons from "./components/SimulatorButtons";

const MAX_EVENTS = 8;

function averageSubScores(events: HighRiskEvent[]): SubScores {
  const n = events.length || 1;
  const totals = events.reduce(
    (acc, e) => {
      acc.behavioral += e.signalFusion[0] * 100;
      acc.deviceTrust += e.signalFusion[1] * 100;
      acc.kyc += e.signalFusion[2] * 100;
      acc.insiderMisuse += (e.insiderMisuseScore ?? 0) * 100;
      return acc;
    },
    { behavioral: 0, deviceTrust: 0, kyc: 0, insiderMisuse: 0 }
  );
  return {
    behavioral: Math.round(totals.behavioral / n),
    deviceTrust: Math.round(totals.deviceTrust / n),
    kyc: Math.round(totals.kyc / n),
    insiderMisuse: Math.round(totals.insiderMisuse / n),
  };
}

export default function ThreatMonitorPage() {
  const [events, setEvents] = useState<HighRiskEvent[]>([]);
  const [trust, setTrust] = useState<TrustLevelStats | null>(null);
  const [stepUp, setStepUp] = useState<StepUpAuthStats | null>(null);
  const [cluster, setCluster] = useState<AnomalyCluster | null>(null);
  const [selectedCase, setSelectedCase] = useState<CaseDetail | null>(null);

  useEffect(() => {
    // Start empty to let the live feed populate naturally
    setTrust(generateTrustLevelStats());
    setStepUp(generateStepUpAuthStats());
    setCluster(generateAnomalyCluster());

    const eventSource = new EventSource("http://localhost:8000/feed");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Construct a HighRiskEvent from the payload
      const newEvent: HighRiskEvent = {
        id: data.id,
        hmac: data.hmac,
        score: Math.round(data.score * 100),
        signalFusion: data.signalFusion,
        insiderMisuseScore: data.insiderMisuseScore,
        decision: data.decision,
        reasonLabel: data.reasonLabel,
        timestamp: data.timestamp,
      };
      
      // Store the raw backend result so CaseDrillDownPanel can see it
      (newEvent as any)._rawCaseDetail = data;
      
      setEvents((prev) =>
        [newEvent, ...prev]
          .sort((a, b) => b.score - a.score)
          .slice(0, MAX_EVENTS)
      );
    };

    return () => eventSource.close();
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
      <LiveFeedTicker events={events} />

      <main className="p-6 space-y-6">
        <SimulatorButtons />
        <WelcomeBanner />
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 items-start">
          <div className="space-y-4">
            <GlobalTrustCard stats={trust} />
            <StepUpAuthCard stats={stepUp} />
          </div>
          <HighRiskEventsTable
            events={events}
            onRowClick={(event) => {
              if ((event as any)._rawCaseDetail) {
                const raw = (event as any)._rawCaseDetail;
                const fused = raw.fusedResult;
                setSelectedCase({
                  id: event.id,
                  hmac: event.hmac,
                  decision: event.decision,
                  score: Math.round(event.score * 100),
                  timestamp: event.timestamp,
                  subScores: {
                    behavioral: Math.round((fused.sub_scores.behavioral?.score || 0) * 100),
                    deviceTrust: Math.round((fused.sub_scores.device_trust?.score || 0) * 100),
                    kyc: Math.round((fused.sub_scores.kyc?.score || 0) * 100),
                    insiderMisuse: Math.round((fused.sub_scores.insider_misuse?.score || 0) * 100),
                  },
                  reasonCodes: fused.reason_codes.map((code: string) => ({
                    feature: code,
                    contribution: 0.15, // Mock value since backend doesn't send SHAP values directly yet
                    direction: "increases_risk"
                  })),
                  deviceGraph: generateCaseDetail(event).deviceGraph, // Keep mock graph for now
                  audit: {
                    eventId: event.id,
                    decision: event.decision,
                    fusedScore: Math.round(event.score * 100),
                    subScores: {
                      behavioral: Math.round((fused.sub_scores.behavioral?.score || 0) * 100),
                      deviceTrust: Math.round((fused.sub_scores.device_trust?.score || 0) * 100),
                      kyc: Math.round((fused.sub_scores.kyc?.score || 0) * 100),
                      insiderMisuse: Math.round((fused.sub_scores.insider_misuse?.score || 0) * 100),
                    },
                    reasonCodes: [],
                    policyVersion: "v1.0-live",
                    timestamp: event.timestamp,
                    consentBasis: "legitimate_interest_fraud_prevention",
                  },
                  raw_event: raw.raw_event,
                  investigator_report: raw.investigator_report
                });
              } else {
                setSelectedCase(generateCaseDetail(event));
              }
            }}
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
