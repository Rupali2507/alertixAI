// lib/mockData.ts
//
// Types + mock fixtures for the Identity Trust Framework dashboard.
// Shapes here are written to match Muskan's "frozen inference interface spec"
// (Phase 2 handoff) as closely as we can guess ahead of time — once that
// spec lands, only this file and lib/api.ts should need to change.

export type EventType = "login" | "transaction" | "onboarding" | "admin_action";
export type Decision = "allow" | "step_up" | "block";

export interface SubScores {
  behavioral: number; // 0-100, Isolation Forest / autoencoder
  deviceTrust: number; // 0-100, GraphSAGE/GAT
  kyc: number; // 0-100, CatBoost/LightGBM
  insiderMisuse: number; // 0-100, per-cohort Isolation Forest
}

export interface ReasonCode {
  feature: string;
  contribution: number; // SHAP value, signed
  direction: "increases_risk" | "decreases_risk";
}

export interface DeviceGraphNode {
  id: string;
  label: string;
  kind: "user" | "device" | "ip";
  suspicious: boolean;
}

export interface DeviceGraphEdge {
  source: string;
  target: string;
  weight: number;
}

export interface DeviceGraph {
  nodes: DeviceGraphNode[];
  edges: DeviceGraphEdge[];
}

export interface AuditLogEntry {
  eventId: string;
  decision: Decision;
  fusedScore: number;
  subScores: SubScores;
  reasonCodes: ReasonCode[];
  policyVersion: string;
  timestamp: string;
  consentBasis: string;
}

export interface DecisionEvent {
  id: string;
  timestamp: string;
  userId: string;
  eventType: EventType;
  decision: Decision;
  fusedScore: number;
  subScores: SubScores;
  reasonCodes: ReasonCode[];
  deviceGraph: DeviceGraph;
  audit: AuditLogEntry;
}

const REASON_POOL: Omit<ReasonCode, "contribution">[] = [
  { feature: "new_device_fingerprint", direction: "increases_risk" },
  { feature: "impossible_travel_velocity", direction: "increases_risk" },
  { feature: "ip_reputation_score", direction: "increases_risk" },
  { feature: "kyc_document_mismatch", direction: "increases_risk" },
  { feature: "session_typing_cadence_match", direction: "decreases_risk" },
  { feature: "known_device_trust_score", direction: "decreases_risk" },
  { feature: "account_tenure_days", direction: "decreases_risk" },
  { feature: "admin_privilege_escalation", direction: "increases_risk" },
];

function randomBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

function decisionFromScore(fusedScore: number): Decision {
  if (fusedScore >= 75) return "block";
  if (fusedScore >= 40) return "step_up";
  return "allow";
}

function mockReasonCodes(fusedScore: number): ReasonCode[] {
  const count = fusedScore >= 75 ? 4 : fusedScore >= 40 ? 3 : 2;
  const shuffled = [...REASON_POOL].sort(() => Math.random() - 0.5).slice(0, count);
  return shuffled.map((r) => ({
    ...r,
    contribution:
      r.direction === "increases_risk"
        ? randomBetween(0.05, 0.35)
        : -randomBetween(0.05, 0.35),
  }));
}

function mockDeviceGraph(userId: string, suspicious: boolean): DeviceGraph {
  const deviceId = `device_${Math.floor(Math.random() * 900 + 100)}`;
  const ipId = `ip_${Math.floor(Math.random() * 900 + 100)}`;
  return {
    nodes: [
      { id: userId, label: userId, kind: "user", suspicious: false },
      { id: deviceId, label: deviceId, kind: "device", suspicious },
      { id: ipId, label: ipId, kind: "ip", suspicious },
    ],
    edges: [
      { source: userId, target: deviceId, weight: randomBetween(0.4, 1) },
      { source: deviceId, target: ipId, weight: randomBetween(0.4, 1) },
    ],
  };
}

const EVENT_TYPES: EventType[] = ["login", "transaction", "onboarding", "admin_action"];

export function generateMockEvent(index: number): DecisionEvent {
  const userId = `user_${1000 + Math.floor(Math.random() * 200)}`;
  const eventType = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];

  const subScores: SubScores = {
    behavioral: randomBetween(0, 100),
    deviceTrust: randomBetween(0, 100),
    kyc: randomBetween(0, 100),
    insiderMisuse: eventType === "admin_action" ? randomBetween(20, 100) : randomBetween(0, 40),
  };

  const fusedScore = Math.round(
    subScores.behavioral * 0.3 +
      subScores.deviceTrust * 0.25 +
      subScores.kyc * 0.25 +
      subScores.insiderMisuse * 0.2
  );

  const decision = decisionFromScore(fusedScore);
  const reasonCodes = mockReasonCodes(fusedScore);
  const timestamp = new Date(Date.now() - index * 15000).toISOString();
  const id = `evt_${Date.now()}_${index}`;

  return {
    id,
    timestamp,
    userId,
    eventType,
    decision,
    fusedScore,
    subScores,
    reasonCodes,
    deviceGraph: mockDeviceGraph(userId, decision !== "allow"),
    audit: {
      eventId: id,
      decision,
      fusedScore,
      subScores,
      reasonCodes,
      policyVersion: "v0.1-mock",
      timestamp,
      consentBasis: "legitimate_interest_fraud_prevention",
    },
  };
}

export function generateMockFeed(count: number): DecisionEvent[] {
  return Array.from({ length: count }, (_, i) => generateMockEvent(i)).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

// --- Threat Monitor page additions ---

export interface TrustLevelStats {
  score: number; // 0-100
  status: "NOMINAL" | "ELEVATED" | "CRITICAL";
  baselineDeviationPct: number;
  activeSessions: number;
}

export interface StepUpAuthStats {
  mfaChallenges: number;
  fido2SuccessRate: number; // 0-100
  smsFallbackRate: number; // 0-100
}

export interface HighRiskEvent {
  id: string;
  hmac: string; // shortened display hash, e.g. "a7f2e9b0...4c1d"
  score: number; // 0-1
  signalFusion: [number, number, number]; // 3 sub-signal intensities 0-1
  decision: Decision;
  reasonLabel: string; // "KYC Failure" / "Identity Verified"
  timestamp: string;
}

export interface AnomalyCluster {
  region: string;
  description: string;
}

function hexChars(n: number): string {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

function mockHmac(): string {
  return `${hexChars(8)}...${hexChars(4)}`;
}

const REASON_LABELS: Record<Decision, string[]> = {
  block: ["KYC Failure", "Sanctions List Match", "Device Blacklisted"],
  step_up: ["Velocity Anomaly", "New Device", "Geo Mismatch"],
  allow: ["Identity Verified", "Trusted Device", "Consistent Behavior"],
};

export function generateTrustLevelStats(): TrustLevelStats {
  const score = Math.round(randomBetween(55, 95));
  const status = score >= 80 ? "NOMINAL" : score >= 55 ? "ELEVATED" : "CRITICAL";
  return {
    score,
    status,
    baselineDeviationPct: Number(randomBetween(-3, 3).toFixed(1)),
    activeSessions: Math.round(randomBetween(9000, 18000)),
  };
}

export function generateStepUpAuthStats(): StepUpAuthStats {
  return {
    mfaChallenges: Math.round(randomBetween(2500, 5000)),
    fido2SuccessRate: Number(randomBetween(90, 99.5).toFixed(1)),
    smsFallbackRate: Number(randomBetween(5, 20).toFixed(1)),
  };
}

export function generateHighRiskEvent(index: number): HighRiskEvent {
  const score = Number(randomBetween(0, 1).toFixed(2));
  const decision = decisionFromScore(score * 100);
  const reasonPool = REASON_LABELS[decision];
  return {
    id: `hre_${Date.now()}_${index}`,
    hmac: mockHmac(),
    score,
    signalFusion: [randomBetween(0, 1), randomBetween(0, 1), randomBetween(0, 1)] as [
      number,
      number,
      number
    ],
    decision,
    reasonLabel: reasonPool[Math.floor(Math.random() * reasonPool.length)],
    timestamp: new Date(Date.now() - index * 20000).toISOString(),
  };
}

export function generateHighRiskEvents(count: number): HighRiskEvent[] {
  return Array.from({ length: count }, (_, i) => generateHighRiskEvent(i)).sort(
    (a, b) => b.score - a.score
  );
}

export function generateAnomalyCluster(): AnomalyCluster {
  const regions = ["AP-EAST", "EU-WEST", "US-CENTRAL", "SA-EAST"];
  return {
    region: regions[Math.floor(Math.random() * regions.length)],
    description: "Velocity mismatch across 300+ identities in 5m.",
  };
}

// --- Insider Misuse page additions ---

export interface SlidingWindowPoint {
  index: number;
  value: number;
  isAnomaly: boolean;
  isCurrentWindow: boolean;
}

export interface ThresholdControls {
  massExportRateGbHr: number; // 0.5 - 5.0
  kycOverrideVelocity: number; // 5 - 50 per 10m
}

export interface EscalatedAlert {
  id: string;
  severity: "CRITICAL" | "HIGH";
  title: string;
  timestamp: string;
  description: string;
  details: { label: string; value: string }[];
}

export interface AdminAction {
  timestamp: string;
  hashId: string;
  actionType: string;
  target: string;
  status: "SUCCESS" | "ALERTED" | "FLAGGED";
}

export function generateSlidingWindow(count = 9): SlidingWindowPoint[] {
  const anomalyIndex = Math.floor(count * 0.3);
  const currentIndex = Math.floor(count * 0.75);
  return Array.from({ length: count }, (_, i) => ({
    index: i,
    value: i === anomalyIndex || i === currentIndex ? randomBetween(70, 100) : randomBetween(15, 55),
    isAnomaly: i === anomalyIndex,
    isCurrentWindow: i === currentIndex,
  }));
}

export function generateThresholdControls(): ThresholdControls {
  return {
    massExportRateGbHr: Number(randomBetween(1, 4).toFixed(1)),
    kycOverrideVelocity: Math.round(randomBetween(10, 25)),
  };
}

export function generateEscalatedAlerts(): EscalatedAlert[] {
  const now = new Date();
  return [
    {
      id: "alert_1",
      severity: "CRITICAL",
      title: "Mass Export Detected",
      timestamp: now.toISOString(),
      description: "Unusual volume of customer records exported to external drive. Entity bypass applied.",
      details: [
        { label: "Entity", value: `u_${Math.floor(randomBetween(10000, 99999))}` },
        { label: "Volume", value: `${randomBetween(1, 5)} GB` },
        { label: "Dest", value: "USB_DEV_9" },
        { label: "Score", value: `${Math.round(randomBetween(90, 100))}/100` },
      ],
    },
    {
      id: "alert_2",
      severity: "HIGH",
      title: "KYC Overrides Spiked",
      timestamp: new Date(now.getTime() - 27 * 60000).toISOString(),
      description: "Single admin account bypassed KYC verification for multiple high-risk profiles.",
      details: [
        { label: "Admin", value: `adm_${hexChars(3)}` },
        { label: "Count", value: `${Math.round(randomBetween(5, 25))} accounts` },
        { label: "Region", value: "EU-WEST" },
        { label: "Score", value: `${Math.round(randomBetween(70, 89))}/100` },
      ],
    },
  ];
}

const ACTION_TYPES = ["PERM_ELEVATE", "BULK_EXPORT", "CFG_UPDATE", "KYC_BYPASS", "LOGIN_SSO"];
const ACTION_STATUSES: AdminAction["status"][] = ["SUCCESS", "SUCCESS", "SUCCESS", "ALERTED", "FLAGGED"];

export function generateAdminActions(count = 5): AdminAction[] {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: new Date(Date.now() - i * 3 * 60000).toLocaleTimeString(),
    hashId: `0x${hexChars(8)}...`,
    actionType: ACTION_TYPES[Math.floor(Math.random() * ACTION_TYPES.length)],
    target: `${["srv_db_main", "cust_pii_eu", "fw_rule_out", "acct_batch_9", "sys_portal"][i % 5]}`,
    status: ACTION_STATUSES[Math.floor(Math.random() * ACTION_STATUSES.length)],
  }));
}

// --- Privacy & Audit page additions ---

export interface PrivacyAnalyticsPoint {
  hour: string;
  value: number;
}

export interface ComplianceItem {
  name: string;
  status: "Compliant" | "Pending Audit";
  description: string;
  progress: number; // 0-100
}

export type AuditDecision = "ALLOW" | "DENY" | "CHALLENGE";

export interface AuditLogRow {
  timestamp: string;
  hashedSubject: string;
  decision: AuditDecision;
  policyVersion: string;
  consentBasis: string;
  context: string;
}

export function generatePrivacyAnalytics(count = 9): PrivacyAnalyticsPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    hour: `${String(i * 3).padStart(2, "0")}:00`,
    value: randomBetween(20, 100),
  }));
}

export function generateComplianceItems(): ComplianceItem[] {
  return [
    {
      name: "GDPR Art. 25 & 32",
      status: "Compliant",
      description: "Data Protection by Design / Security of Processing.",
      progress: 100,
    },
    {
      name: "SOC 2 Type II",
      status: "Compliant",
      description: "Security, Availability, and Confidentiality criteria met.",
      progress: 100,
    },
    {
      name: "CCPA / CPRA",
      status: "Pending Audit",
      description: "Consumer Privacy Rights fulfillment mapping in progress.",
      progress: Math.round(randomBetween(40, 75)),
    },
  ];
}

const CONSENT_BASES = ["LegitimateInterest", "ExplicitConsent", "Contract", "ExplicitConsentRevoked"];
const AUDIT_DECISIONS: AuditDecision[] = ["ALLOW", "ALLOW", "ALLOW", "DENY", "CHALLENGE"];

export function generateAuditLogRows(count = 6): AuditLogRow[] {
  return Array.from({ length: count }, (_, i) => {
    const decision = AUDIT_DECISIONS[Math.floor(Math.random() * AUDIT_DECISIONS.length)];
    const basis = CONSENT_BASES[Math.floor(Math.random() * CONSENT_BASES.length)];
    return {
      timestamp: new Date(Date.now() - i * 45000).toISOString(),
      hashedSubject: `${hexChars(8)}...${hexChars(6)}`,
      decision,
      policyVersion: "v2.4.1",
      consentBasis: basis,
      context: `{"basis": "${basis}", "module": "${["geo", "device", "kyc"][i % 3]}"}`,
    };
  });
}

// --- System Health page additions ---

export interface KafkaStreamStatus {
  healthy: boolean;
  zookeeperPort: string;
  brokerPort: string;
  throughputEps: number;
  consumerLagMsgs: number;
  activePartitions: number;
  totalPartitions: number;
}

export interface FastApiStatus {
  port: number;
  healthy: boolean;
  avgResponseMs: number;
  errorRatePct: number;
  activeConnections: number;
}

export interface ModelInferenceStat {
  name: string;
  latencyMs: number;
}

export interface FeatureStoreStats {
  storageUsageTb: number;
  storageGrowthTb: number;
  batchWriteLatencySec: number;
}

export interface ContainerStatusRow {
  id: string;
  image: string;
  status: "Up 4 days" | "Up 12 hours" | "Restarting";
  cpuPct: number;
  memUsedGb: number;
  memTotalGb: number;
}

export function generateKafkaStreamStatus(): KafkaStreamStatus {
  return {
    healthy: true,
    zookeeperPort: ":2182",
    brokerPort: ":9093",
    throughputEps: Math.round(randomBetween(18000, 28000)),
    consumerLagMsgs: Math.round(randomBetween(2, 20)),
    activePartitions: 128,
    totalPartitions: 128,
  };
}

export function generateFastApiStatus(): FastApiStatus {
  return {
    port: 8001,
    healthy: true,
    avgResponseMs: Math.round(randomBetween(25, 60)),
    errorRatePct: Number(randomBetween(0, 0.1).toFixed(2)),
    activeConnections: Math.round(randomBetween(900, 1800)),
  };
}

export function generateModelInferenceStats(): ModelInferenceStat[] {
  return [
    { name: "Behavioral Analytics", latencyMs: Math.round(randomBetween(90, 140)) },
    { name: "Device Fingerprinting", latencyMs: Math.round(randomBetween(30, 60)) },
    { name: "KYC & Identity", latencyMs: Math.round(randomBetween(60, 100)) },
  ];
}

export function generateFeatureStoreStats(): FeatureStoreStats {
  return {
    storageUsageTb: Number(randomBetween(35, 50).toFixed(1)),
    storageGrowthTb: Number(randomBetween(0.5, 2).toFixed(1)),
    batchWriteLatencySec: Number(randomBetween(0.8, 2).toFixed(1)),
  };
}

export function generateContainerStatus(): ContainerStatusRow[] {
  return [
    {
      id: hexChars(8),
      image: "alertix/kafka-broker:v2.1",
      status: "Up 4 days",
      cpuPct: Number(randomBetween(30, 55).toFixed(1)),
      memUsedGb: Number(randomBetween(3, 5).toFixed(1)),
      memTotalGb: 8,
    },
    {
      id: hexChars(8),
      image: "alertix/zookeeper:v3.5",
      status: "Up 4 days",
      cpuPct: Number(randomBetween(8, 18).toFixed(1)),
      memUsedGb: Number(randomBetween(0.8, 1.5).toFixed(1)),
      memTotalGb: 2,
    },
    {
      id: hexChars(8),
      image: "alertix/fastapi-router:v1.8",
      status: "Up 12 hours",
      cpuPct: Number(randomBetween(20, 35).toFixed(1)),
      memUsedGb: Number(randomBetween(0.6, 1).toFixed(1)),
      memTotalGb: 1,
    },
    {
      id: hexChars(8),
      image: "alertix/inference-engine:v4.0",
      status: "Restarting",
      cpuPct: Number(randomBetween(85, 99).toFixed(1)),
      memUsedGb: Number(randomBetween(14, 16).toFixed(1)),
      memTotalGb: 16,
    },
  ];
}

// --- Case drill-down bridge (Threat Monitor row -> full case detail) ---

export interface CaseDetail {
  id: string;
  hmac: string;
  score: number;
  decision: Decision;
  timestamp: string;
  subScores: Record<string, number>;
  reasonCodes: ReasonCode[];
  deviceGraph: {
    nodes: number;
    edges: number;
    communityRisk: number;
  };
  audit: {
    policyVersion: string;
    consentBasis: string;
    eventId: string;
  };
  raw_event?: any;
  investigator_report?: string;
}

export function generateCaseDetail(source: HighRiskEvent): CaseDetail {
  const scorePct = Math.round(source.score * 100);
  const [behavioral, deviceTrust, kyc] = source.signalFusion.map((v) => Math.round(v * 100));

  const subScores: SubScores = {
    behavioral,
    deviceTrust,
    kyc,
    insiderMisuse: Math.round(randomBetween(0, 40)),
  };

  const reasonCodes = mockReasonCodes(scorePct);
  const deviceGraph = mockDeviceGraph(source.hmac, source.decision !== "allow");

  return {
    hmac: source.hmac,
    decision: source.decision,
    score: scorePct,
    timestamp: source.timestamp,
    subScores,
    reasonCodes,
    deviceGraph,
    audit: {
      eventId: source.id,
      decision: source.decision,
      fusedScore: scorePct,
      subScores,
      reasonCodes,
      policyVersion: "v2.4.1",
      timestamp: source.timestamp,
      consentBasis: "legitimate_interest_fraud_prevention",
    },
  };
}
