// app/kyc-fraud/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { UserPlus, Radio } from "lucide-react";
import { ApplicationInput, KycApplicant, evaluateApplication, generateAmbientApplication, seedInitialApplicants } from "@/lib/kycFraudData";
import TopBar from "../components/TopBar";
import IdentityGraphView from "./components/IdentityGraphView";
import ScoreBreakdownCard from "./components/ScoreBreakDownCard";
import DecisionBanner from "./components/DecisionBanner";
import FraudPropagationCard from "./components/FraudPropagationCard";
import ApplicantQueueTable from "./components/ApplicantQueueTable";
import NewApplicationModal from "./components/NewApplicationModal";

export default function KycFraudPage() {
  const [applicants, setApplicants] = useState<KycApplicant[]>(() => seedInitialApplicants());
  const [selectedId, setSelectedId] = useState<string>(() => applicants[0].applicantId);
  const [pinned, setPinned] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = applicants.find((a) => a.applicantId === selectedId) ?? applicants[0];

  // any case that isn't a clean auto-approval stays on screen until you
  // explicitly move away from it — background traffic can never bump it
  useEffect(() => {
    if (selected.decision !== "straight_through") setPinned(true);
  }, [selected.decision]);

  useEffect(() => {
    const schedule = () => {
      timerRef.current = setTimeout(() => {
        const next = generateAmbientApplication();
        setApplicants((prev) => [next, ...prev].slice(0, 16));
        setPinned((currentlyPinned) => {
          if (!currentlyPinned) setSelectedId(next.applicantId);
          return currentlyPinned;
        });
        schedule();
      }, 8000 + Math.random() * 5000);
    };
    schedule();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleFormSubmit = (input: ApplicationInput) => {
    const next = evaluateApplication(input, "manual_submission");
    setApplicants((prev) => [next, ...prev].slice(0, 16));
    setSelectedId(next.applicantId);
    setPinned(true);
    setFormOpen(false);
  };

  const backToLive = () => {
    setPinned(false);
    setSelectedId(applicants[0].applicantId);
  };

  return (
    <div className="min-h-screen">
      <TopBar title="" searchPlaceholder="Search applicant, device, IP..." />

      <main className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="tracking-label text-[11px] text-brand mb-2">kyc & onboarding</p>
            <h1 className="text-2xl font-medium text-ink mb-1">Identity Verification</h1>
            <p className="text-sm text-mist max-w-2xl">
              Every new application is checked against document, biometric, and data-validation signals,
              then placed into the identity graph to see whether it's connected to a previously confirmed
              fraud case — even if the name, phone, and address are completely different.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {pinned && (
              <button
                onClick={backToLive}
                className="flex items-center gap-1.5 rounded-lg glass-card px-3.5 py-2 text-sm text-mist hover:text-ink"
              >
                <Radio size={13} />
                Back to live queue
              </button>
            )}
            <button
              onClick={() => setFormOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm text-black font-medium hover:bg-brand/90"
            >
              <UserPlus size={14} />
              New Application
            </button>
          </div>
        </div>

        <DecisionBanner applicant={selected} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">
          <div className="rounded-xl border border-border bg-panel p-5">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-semibold text-ink">Identity Graph</h2>
              <span className="text-xs font-mono text-mist">{selected.graph.nodes.length} connections traced</span>
            </div>
            <p className="text-xs text-mist mb-4">
              This applicant's device, IP, and face match are checked against every past case. Red nodes
              are confirmed fraud — a line connecting to one means shared infrastructure, not a shared name.
            </p>
            <IdentityGraphView graph={selected.graph} />
          </div>
          <ScoreBreakdownCard applicant={selected} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4 items-start">
          <FraudPropagationCard graphFraudScore={selected.graphFraudScore} contributions={selected.attentionContributions} />
          <ApplicantQueueTable
            applicants={applicants}
            selectedId={selectedId}
            onSelect={(id) => {
              setPinned(true);
              setSelectedId(id);
            }}
          />
        </div>
      </main>

      {formOpen && <NewApplicationModal onClose={() => setFormOpen(false)} onSubmit={handleFormSubmit} />}
    </div>
  );
}