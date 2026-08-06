// lib/api.ts
//
// Data-access layer for the dashboard. Everything here is mock-backed for
// now (Phase 1). In Phase 6, only the bodies of these functions change —
// swap in a fetch() to the orchestrator's /score endpoint and a WebSocket
// (or short-poll) to its live feed. Callers in components/pages should
// never need to change.

import { DecisionEvent, generateMockEvent, generateMockFeed } from "./mockData";

const USE_MOCK = false; // flip to false in Phase 6 once the live feed exists

const ORCHESTRATOR_BASE_URL =
  process.env.NEXT_PUBLIC_ORCHESTRATOR_URL ?? "http://localhost:8000";

/**
 * Fetch the initial batch of recent events for the dashboard.
 */
export async function fetchInitialFeed(count = 20): Promise<DecisionEvent[]> {
  if (USE_MOCK) {
    return generateMockFeed(count);
  }
  const res = await fetch(`${ORCHESTRATOR_BASE_URL}/feed?limit=${count}`);
  if (!res.ok) throw new Error(`Failed to fetch feed: ${res.status}`);
  return res.json();
}

/**
 * Fetch a single event/case by id (used by the case drill-down page).
 */
export async function fetchEventById(id: string): Promise<DecisionEvent | null> {
  if (USE_MOCK) {
    // In mock mode we just synthesize one deterministically-ish — real
    // version will hit GET /case/{id} on the orchestrator.
    return generateMockEvent(0);
  }
  const res = await fetch(`${ORCHESTRATOR_BASE_URL}/case/${id}`);
  if (!res.ok) return null;
  return res.json();
}

/**
 * Subscribe to the live decision feed. Returns an unsubscribe function.
 *
 * Mock mode: pushes a new synthetic event every `intervalMs`.
 * Real mode (Phase 6): opens a WebSocket to the orchestrator's /feed/live
 * endpoint and forwards parsed messages to onEvent.
 */
export function subscribeToLiveFeed(
  onEvent: (event: DecisionEvent) => void,
  intervalMs = 4000
): () => void {
  if (USE_MOCK) {
    let i = 1000;
    const timer = setInterval(() => {
      onEvent(generateMockEvent(i++));
    }, intervalMs);
    return () => clearInterval(timer);
  }

  const ws = new WebSocket(
    `${ORCHESTRATOR_BASE_URL.replace(/^http/, "ws")}/feed/live`
  );
  ws.onmessage = (msg) => {
    try {
      const event: DecisionEvent = JSON.parse(msg.data);
      onEvent(event);
    } catch (err) {
      console.error("Failed to parse live feed message", err);
    }
  };
  return () => ws.close();
}

/**
 * Trigger the mock step-up auth flow (OTP/biometric/liveness).
 * Real mode (Phase 3) hits Ratnesh's mock step-up endpoint.
 */
export type StepUpMethod = "otp" | "biometric" | "liveness";

export async function triggerStepUpAuth(
  eventId: string,
  method: StepUpMethod
): Promise<{ success: boolean; method: StepUpMethod }> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 1400));
    return { success: true, method };
  }
  const res = await fetch(`${ORCHESTRATOR_BASE_URL}/stepup/${eventId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method }),
  });
  if (!res.ok) throw new Error(`Step-up auth failed: ${res.status}`);
  return res.json();
}

/**
 * Risk-based login. Hits POST /auth/login on the orchestrator, which runs
 * behavioral + device_trust + login_trust (JA3 / geo-velocity / login
 * frequency) and returns allow | step_up | block with ranked reason codes.
 *
 * device_id is a stable per-browser identifier (NOT a JA3 fingerprint —
 * JA3 is computed server-side from the raw TLS handshake by the proxy in
 * front of the orchestrator; the browser has no access to it). We persist
 * a random UUID in localStorage so the same browser is recognized as the
 * same "device" across logins, which is what device_trust's
 * is_new_device signal depends on.
 */
export type LoginDecision = "allow" | "step_up" | "block";

export interface LoginResult {
  decision: LoginDecision;
  fused_score: number;
  reason_codes: string[];
  session_token?: string;
  challenge_hint?: string;
  /** True when this result was synthesized locally because the
   * orchestrator was unreachable/erroring — not a real risk decision. */
  demo?: boolean;
}

const DEVICE_ID_KEY = "alertixai_device_id";

/**
 * Fetch with a hard timeout, since a hung/unreachable orchestrator
 * shouldn't leave the login screen stuck on "Verifying…" forever.
 */
async function fetchWithTimeout(
  url: string,
  opts: RequestInit,
  timeoutMs = 6000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Deterministic, self-contained stand-in for the orchestrator's decision
 * when it's unreachable/down/erroring. Same user_id always maps to the
 * same demo outcome, so the demo is reproducible across attempts.
 *
 * This is a UI fallback only — it never runs when the orchestrator
 * actually responds, and it never overrides a real 401/403 from a
 * reachable backend.
 */
function demoLoginResult(userId: string): LoginResult {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  const score = (hash % 100) / 100;

  if (score >= 0.65) {
    return {
      decision: "block",
      fused_score: score,
      reason_codes: [
        "Unusual login location for this account",
        "Device fingerprint not previously seen",
        "Multiple rapid login attempts",
      ],
      demo: true,
    };
  }
  if (score >= 0.3) {
    return {
      decision: "step_up",
      fused_score: score,
      reason_codes: ["New device fingerprint", "Login velocity above baseline"],
      demo: true,
    };
  }
  return {
    decision: "allow",
    fused_score: score,
    reason_codes: [],
    session_token: `demo_session_${Date.now()}`,
    demo: true,
  };
}

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export async function loginUser(
  userId: string,
  password: string
): Promise<LoginResult> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 900));
    return { decision: "allow", fused_score: 0.12, reason_codes: [], session_token: "mock_session" };
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(`${ORCHESTRATOR_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        password,
        device_id: getOrCreateDeviceId(),
      }),
    });
  } catch (err) {
    // Network error, DNS failure, timeout/abort, backend process down —
    // the orchestrator was never reached at all. Fall back to demo mode
    // instead of surfacing a raw fetch error.
    console.warn("[loginUser] orchestrator unreachable, using demo fallback:", err);
    return demoLoginResult(userId);
  }

  if (res.status === 401) {
    // Backend WAS reachable and explicitly rejected these credentials —
    // this is a real answer, never fall back for it.
    throw new Error("Invalid credentials");
  }
  if (res.status === 403) {
    const body = await res.json();
    // FastAPI wraps our HTTPException detail dict under "detail"
    const detail = body.detail ?? body;
    return {
      decision: "block",
      fused_score: detail.fused_score,
      reason_codes: detail.reason_codes ?? [],
    };
  }
  if (!res.ok) {
    // Backend reachable but erroring (500s, bad gateway from a crashed
    // orchestrator, etc.) — treat the same as "down" for UX purposes.
    console.warn(`[loginUser] orchestrator returned ${res.status}, using demo fallback`);
    return demoLoginResult(userId);
  }
  return res.json();
}