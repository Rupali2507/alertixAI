// lib/deviceGraph.ts
//
// Builds a DeviceGraph from the ACTUAL fields on a scored event
// (user hmac, device_id, ip_address) — no randomness, no synthesized
// nodes. This is intentionally a 3-node star, not a multi-hop graph,
// because that's all backend/routers/feed.py currently sends per event.
// A real multi-hop view would need score.py to expose
// ml/device_trust/graph_builder.py's IdentityGraph over the wire, which
// it doesn't yet — flagging that as a real gap, not papering over it.

import { DeviceGraph } from "./mockData";

export function buildDeviceGraphFromEvent(
  hmac: string,
  rawEvent: any,
  deviceTrustReasonCodes: string[] = []
): DeviceGraph {
  const deviceId: string = rawEvent?.device_id ?? "unknown_device";
  const ip: string = rawEvent?.ip_address ?? "unknown_ip";

  const deviceFlagged = deviceTrustReasonCodes.includes("device_shared_across_many_users");
  const ipFlagged = deviceTrustReasonCodes.includes("ip_shared_across_many_users");

  return {
    nodes: [
      { id: hmac, label: hmac, kind: "user", suspicious: false },
      { id: deviceId, label: deviceId, kind: "device", suspicious: deviceFlagged },
      { id: ip, label: ip, kind: "ip", suspicious: ipFlagged },
    ],
    edges: [
      { source: hmac, target: deviceId, weight: 1 },
      { source: deviceId, target: ip, weight: 1 },
    ],
  };
}