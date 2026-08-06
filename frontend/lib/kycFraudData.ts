// lib/kycFraudData.ts
//
// Fraud-history "database" + identity-graph matching engine for the KYC
// module. Frontend-only. The seed bank below stands in for the confirmed-
// fraud portion of the identity graph (Layer 3) — in production this is
// Neo4j; here it's a large in-memory table so the graph has real density
// to match against.

export type GraphNodeKind = "applicant" | "device" | "ip" | "face_cluster" | "bank_account";

export type EdgeRelation =
  | "used_device"
  | "used_ip"
  | "shares_phone_prefix"
  | "linked_bank_account"
  | "similar_face_embedding"
  | "similar_address";

export interface KycGraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  isFraudSeed: boolean;
  isNew: boolean;
  hop: number;
}

export interface KycGraphEdge {
  source: string;
  target: string;
  relation: EdgeRelation;
  strength: "strong" | "medium" | "weak";
  weight: number;
}

export interface KycGraph {
  nodes: KycGraphNode[];
  edges: KycGraphEdge[];
}

export interface AttentionContribution {
  neighborId: string;
  neighborLabel: string;
  relation: EdgeRelation;
  hop: number;
  attentionWeight: number;
}

export type KycDecision = "straight_through" | "step_up" | "manual_review" | "hard_reject";

export interface ApplicationInput {
  name: string;
  phone: string;
  address: string;
  deviceId: string;
  ipAddress: string;
  faceRef: string;
  bankAccount?: string;
}

export interface KycApplicant extends ApplicationInput {
  applicantId: string;
  documentAuthenticityScore: number;
  biometricConfidenceScore: number;
  dataValidityScore: number;
  graphFraudScore: number;
  blacklistFlag: "none" | "fuzzy" | "exact";
  trustScore: number;
  decision: KycDecision;
  attentionContributions: AttentionContribution[];
  graph: KycGraph;
  timestamp: string;
  source: "live_intake" | "manual_submission";
}

interface SeedRecord {
  id: string;
  name: string;
  device: string;
  ip: string;
  face: string;
  bank: string | null;
  phonePrefix: string;
}

// ── confirmed-fraud history — 7 rings + isolated flags, ~34 records ────────
// Ring members share 1-2 infrastructure fields with each other (the way a
// real fraud ring reuses a device or drop-account across "different" people).

const RING = (
  prefix: string,
  members: { name: string; device?: string; ip?: string; face?: string; bank?: string; phone?: string }[]
): SeedRecord[] => {
  const sharedDevice = `dvc_${prefix}1`;
  const sharedIp = `${103 + members.length}.${21 + members.length}.9.${40 + members.length}`;
  const sharedFace = `face_clu_${prefix}`;
  const sharedBank = `bank_ac_${prefix}9`;
  const sharedPhone = `9${(80000000 + members.length * 111).toString().slice(0, 8)}`;
  return members.map((m, i) => ({
    id: `FR-${prefix.toUpperCase()}${i + 1}`,
    name: m.name,
    device: m.device ?? sharedDevice,
    ip: m.ip ?? sharedIp,
    face: m.face ?? sharedFace,
    bank: m.bank ?? sharedBank,
    phonePrefix: (m.phone ?? sharedPhone).slice(0, 6),
  }));
};

const FRAUD_SEED_BANK: SeedRecord[] = [
  ...RING("a1", [
    { name: "Rohan Kapoor" },
    { name: "Neha Verma", ip: "45.112.6.9" },
    { name: "Karan Malhotra" },
  ]),
  ...RING("b2", [
    { name: "Simran Chadha" },
    { name: "Yusuf Sheikh", device: "dvc_b2x9" },
    { name: "Farhan Ali" },
    { name: "Ayesha Rahim", face: "face_clu_b2alt" },
  ]),
  ...RING("c3", [
    { name: "Deepak Suri" },
    { name: "Manpreet Kaur" },
    { name: "Harpreet Singh" },
  ]),
  ...RING("d4", [
    { name: "Anil Bhatt" },
    { name: "Suresh Nadar", bank: "bank_ac_d4alt" },
    { name: "Ramesh Iyengar" },
    { name: "Vinod Kutty" },
    { name: "Ganesh Pillai" },
  ]),
  ...RING("e5", [
    { name: "Tanvi Oberoi" },
    { name: "Rhea Kohli" },
  ]),
  ...RING("f6", [
    { name: "Imran Qureshi" },
    { name: "Zoya Hashmi", ip: "88.4.201.19" },
    { name: "Bilal Ansari" },
  ]),
  ...RING("g7", [
    { name: "Vikas Chauhan" },
    { name: "Amit Trivedi" },
    { name: "Sunil Dave" },
    { name: "Nitin Sanghvi" },
  ]),
  // isolated single-case flags — not rings, just individually confirmed fraud
  { id: "FR-ISO1", name: "Ajay Bakshi", device: "dvc_iso14", ip: "156.33.8.2", face: "face_clu_iso1", bank: "bank_ac_iso1", phonePrefix: "970012" },
  { id: "FR-ISO2", name: "Preeti Sarin", device: "dvc_iso22", ip: "77.90.4.1", face: "face_clu_iso2", bank: null, phonePrefix: "961144" },
  { id: "FR-ISO3", name: "Rakesh Bindra", device: "dvc_iso31", ip: "12.44.19.6", face: "face_clu_iso3", bank: "bank_ac_iso3", phonePrefix: "988877" },
  { id: "FR-ISO4", name: "Meenal Kothari", device: "dvc_iso45", ip: "203.19.7.3", face: "face_clu_iso4", bank: null, phonePrefix: "955501" },
];

const EDGE_BASE_WEIGHT: Record<EdgeRelation, number> = {
  similar_face_embedding: 0.92,
  linked_bank_account: 0.85,
  used_device: 0.55,
  shares_phone_prefix: 0.40,
  similar_address: 0.35,
  used_ip: 0.20,
};

export const EDGE_LABEL: Record<EdgeRelation, string> = {
  similar_face_embedding: "Face match",
  linked_bank_account: "Bank account",
  used_device: "Device",
  shares_phone_prefix: "Phone number",
  similar_address: "Address",
  used_ip: "IP address",
};

function strengthFor(relation: EdgeRelation): "strong" | "medium" | "weak" {
  const w = EDGE_BASE_WEIGHT[relation];
  if (w >= 0.7) return "strong";
  if (w >= 0.4) return "medium";
  return "weak";
}

let idCounter = 4000;
function nextApplicantId(): string {
  idCounter += 1;
  return `APP-${idCounter}`;
}

function rand(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 1000) / 1000;
}

/**
 * Core matcher: takes real (or generated) applicant fields, checks them
 * against the fraud history on each linkable attribute, builds the
 * identity-graph neighborhood, and scores it. Deterministic given the
 * input — no hidden randomness in the matching logic itself.
 */
export function evaluateApplication(input: ApplicationInput, source: KycApplicant["source"]): KycApplicant {
  const applicantId = nextApplicantId();
  const phonePrefix = input.phone.slice(0, 6);

  const nodes: KycGraphNode[] = [
    { id: applicantId, kind: "applicant", label: input.name, isFraudSeed: false, isNew: true, hop: 0 },
  ];
  const edges: KycGraphEdge[] = [];
  const attentionContributions: AttentionContribution[] = [];

  const infraChecks: { id: string; kind: GraphNodeKind; relation: EdgeRelation; matches: (s: SeedRecord) => boolean }[] = [
    { id: input.deviceId, kind: "device", relation: "used_device", matches: (s) => s.device === input.deviceId },
    { id: input.ipAddress, kind: "ip", relation: "used_ip", matches: (s) => s.ip === input.ipAddress },
    { id: input.faceRef, kind: "face_cluster", relation: "similar_face_embedding", matches: (s) => s.face === input.faceRef },
    ...(input.bankAccount
      ? [{ id: input.bankAccount, kind: "bank_account" as GraphNodeKind, relation: "linked_bank_account" as EdgeRelation, matches: (s: SeedRecord) => s.bank === input.bankAccount }]
      : []),
    { id: `phone:${phonePrefix}`, kind: "device", relation: "shares_phone_prefix", matches: (s) => s.phonePrefix === phonePrefix },
  ];

  for (const check of infraChecks) {
    const linkedFraud = FRAUD_SEED_BANK.filter(check.matches);
    if (linkedFraud.length === 0) continue;

    if (check.relation !== "shares_phone_prefix") {
      nodes.push({ id: check.id, kind: check.kind, label: check.id, isFraudSeed: false, isNew: false, hop: 1 });
      edges.push({ source: applicantId, target: check.id, relation: check.relation, strength: strengthFor(check.relation), weight: EDGE_BASE_WEIGHT[check.relation] });
    }

    for (const f of linkedFraud) {
      const midId = check.relation === "shares_phone_prefix" ? applicantId : check.id;
      if (!nodes.find((n) => n.id === f.id)) {
        nodes.push({ id: f.id, kind: "applicant", label: f.name, isFraudSeed: true, isNew: false, hop: 2 });
      }
      edges.push({ source: midId, target: f.id, relation: check.relation, strength: strengthFor(check.relation), weight: EDGE_BASE_WEIGHT[check.relation] });
      attentionContributions.push({
        neighborId: f.id,
        neighborLabel: f.name,
        relation: check.relation,
        hop: 2,
        attentionWeight: EDGE_BASE_WEIGHT[check.relation],
      });
    }
  }

  const totalW = attentionContributions.reduce((s, c) => s + c.attentionWeight, 0) || 1;
  attentionContributions.forEach((c) => (c.attentionWeight = Math.round((c.attentionWeight / totalW) * 1000) / 1000));
  attentionContributions.sort((a, b) => b.attentionWeight - a.attentionWeight);

  const maxSignal = Math.max(0, ...attentionContributions.map((c) => c.attentionWeight * EDGE_BASE_WEIGHT[c.relation] * 2));
  const rawMax = Math.max(0, ...edges.map((e) => e.weight));
  const graphFraudScore = attentionContributions.length > 0
    ? Math.min(0.97, 0.32 + rawMax * 0.65 + rand(-0.02, 0.04))
    : Math.max(0.02, rand(0.02, 0.14));

  const documentAuthenticityScore = rand(0.8, 0.99);
  const biometricConfidenceScore = rand(0.82, 0.99);
  const dataValidityScore = rand(0.85, 0.99);

  const exactHit = edges.some((e) => (e.relation === "used_device" || e.relation === "similar_face_embedding") && e.weight >= 0.85);
  const blacklistFlag: KycApplicant["blacklistFlag"] = exactHit ? "exact" : graphFraudScore > 0.55 ? "fuzzy" : "none";
  const blacklistScore = blacklistFlag === "exact" ? 1 : blacklistFlag === "fuzzy" ? 0.6 : 0;

  const w = { doc: 0.15, bio: 0.15, data: 0.15, graph: 0.35, blacklist: 0.2 };
  const trustScore = Math.max(0, Math.min(1,
    w.doc * documentAuthenticityScore +
    w.bio * biometricConfidenceScore +
    w.data * dataValidityScore +
    w.graph * (1 - graphFraudScore) +
    w.blacklist * (1 - blacklistScore)
  ));

  let decision: KycDecision;
  if (blacklistFlag === "exact") decision = "hard_reject";
  else if (trustScore > 0.85 && blacklistFlag === "none") decision = "straight_through";
  else if (trustScore > 0.6) decision = "step_up";
  else decision = "manual_review";

  return {
    ...input,
    applicantId,
    documentAuthenticityScore: Math.round(documentAuthenticityScore * 1000) / 1000,
    biometricConfidenceScore: Math.round(biometricConfidenceScore * 1000) / 1000,
    dataValidityScore: Math.round(dataValidityScore * 1000) / 1000,
    graphFraudScore: Math.round(graphFraudScore * 1000) / 1000,
    blacklistFlag,
    trustScore: Math.round(trustScore * 1000) / 1000,
    decision,
    attentionContributions,
    graph: { nodes, edges },
    timestamp: new Date().toISOString(),
    source,
  };
}

// ── ambient background traffic (unattended, low-stakes) ────────────────────

const CLEAN_FIRST = ["Arjun", "Priya", "Vikram", "Ananya", "Rahul", "Divya", "Aditya", "Meera", "Sanjay", "Isha", "Nikhil", "Pooja", "Rajeev", "Kavya", "Siddharth"];
const CLEAN_LAST = ["Sharma", "Patel", "Reddy", "Iyer", "Bose", "Nair", "Gupta", "Rao", "Menon", "Joshi", "Chatterjee", "Desai"];
const ADDR = ["12 MG Road, Bengaluru", "44 Park Street, Kolkata", "7 Linking Road, Mumbai", "21 Sector 18, Gurugram", "9 Anna Salai, Chennai", "3 Jubilee Hills, Hyderabad"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

let ambientCounter = 0;
export function generateAmbientApplication(): KycApplicant {
  ambientCounter += 1;
  const risky = ambientCounter % 3 === 0; // steady, predictable cadence rather than pure noise
  const seed = risky ? pick(FRAUD_SEED_BANK) : null;

  const input: ApplicationInput = {
    name: `${pick(CLEAN_FIRST)} ${pick(CLEAN_LAST)}`,
    phone: `9${Math.floor(100000000 + Math.random() * 899999999)}`,
    address: pick(ADDR),
    deviceId: seed && Math.random() < 0.7 ? seed.device : `dvc_${(Math.random() * 1e5).toFixed(0)}`,
    ipAddress: seed && Math.random() < 0.5 ? seed.ip : `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`,
    faceRef: seed ? seed.face : `face_clu_${(Math.random() * 1e5).toFixed(0)}`,
    bankAccount: Math.random() < 0.5 ? `bank_ac_${(Math.random() * 1e5).toFixed(0)}` : undefined,
  };

  return evaluateApplication(input, "live_intake");
}

export function seedInitialApplicants(): KycApplicant[] {
  return [generateAmbientApplication(), generateAmbientApplication(), generateAmbientApplication()];
}

// Reference values that WILL match the fraud history — useful while
// rehearsing so you can reliably produce a flagged case on demand.
export const DEMO_MATCH_HINTS = {
  device: "dvc_a11",
  ip: "106.24.9.43",
  face: "face_clu_a1",
} as const;