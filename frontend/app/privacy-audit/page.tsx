// app/privacy-audit/page.tsx
"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  PrivacyAnalyticsPoint,
  ComplianceItem,
  AuditLogRow,
  generatePrivacyAnalytics,
  generateComplianceItems,
  generateAuditLogRows,
} from "@/lib/mockData";
import TopBar from "../components/TopBar";
import DifferentialPrivacyCard from "./components/DifferentialPrivacyCard";
import ComplianceMappingCard from "./components/ComplianceMappingCard";
import AuditLogExplorerTable from "./components/AuditLogExplorerTable";

export default function PrivacyAuditPage() {
  const [points, setPoints] = useState<PrivacyAnalyticsPoint[]>([]);
  const [compliance, setCompliance] = useState<ComplianceItem[]>([]);
  const [rows, setRows] = useState<AuditLogRow[]>([]);

  useEffect(() => {
    setPoints(generatePrivacyAnalytics());
    setCompliance(generateComplianceItems());
    
    // Fetch REAL audit logs from backend
    fetch("http://localhost:8000/audit")
      .then(res => res.json())
      .then(data => {
        if (data.logs && data.logs.length > 0) {
          const realRows: AuditLogRow[] = data.logs.map((log: any) => ({
            id: log.event_id,
            hmac: log.user_id_hash.substring(0, 8) + "..." + log.user_id_hash.slice(-4),
            decision: log.decision,
            fusedScore: Math.round(log.fused_score * 100),
            reasonCodes: log.reason_codes,
            timestamp: log.timestamp,
            policyVersion: log.policy_version,
          }));
          setRows(realRows);
        } else {
          setRows(generateAuditLogRows()); // Fallback if empty
        }
      })
      .catch(err => {
        console.error("Failed to fetch real audit logs", err);
        setRows(generateAuditLogRows());
      });
      
  }, []);

  return (
    <div className="min-h-screen">
      <TopBar title="" searchPlaceholder="Search logs, policies, entities..." />

      <main className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="tracking-label text-[11px] text-brand mb-2">privacy & audit</p>
            <h1 className="text-2xl font-medium text-ink">Privacy & Audit</h1>
            <p className="text-sm text-mist mt-1">
              Managing the privacy layer, compliance mapping, and transparent audit trails.
            </p>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg glass-card px-4 py-2.5 shrink-0">
            <ShieldCheck size={20} className="text-success" />
            <div>
              <p className="text-sm font-medium text-ink">Privacy Shield</p>
              <p className="text-xs text-success font-mono">PII Hashing (HMAC-SHA256) Active</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">
          <DifferentialPrivacyCard points={points} />
          <ComplianceMappingCard items={compliance} />
        </div>

        <AuditLogExplorerTable rows={rows} />
      </main>
    </div>
  );
}
