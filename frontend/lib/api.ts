// lib/api.ts
//
// Data-access layer for the dashboard. Everything here is mock-backed for
// now (Phase 1). In Phase 6, only the bodies of these functions change —
// swap in a fetch() to the orchestrator's /score endpoint and a WebSocket
// (or short-poll) to its live feed. Callers in components/pages should
// never need to change.

import { DecisionEvent, generateMockEvent, generateMockFeed } from "./mockData";

const USE_MOCK = true; // flip to false in Phase 6 once the live feed exists

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
