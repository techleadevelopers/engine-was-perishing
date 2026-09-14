import type { ReconTarget } from "./recon-types";

export const DEFAULT_IP = "189.38.41.40";

export const MOCK_TARGET: ReconTarget = {
  ip: DEFAULT_IP,
  source: "mock",
  asn: "AS28309",
  isp: "WGO TELECOM LTDA",
  org: "WGO Telecom / Regional Fiber Edge",
  cidr: "189.38.40.0/22",
  country: "BR",
  region: "Goiás",
  city: "Goiânia",
  latitude: -16.6869,
  longitude: -49.2648,
  timezone: "America/Sao_Paulo",
  hostnames: ["gw-edge-04.wgo-internal.net", "cpe.189-38-41-40.wgotelecom.com.br"],
  ports: [22, 53, 80, 443, 2000, 8080, 8291, 8728],
  vulns: ["CVE-2018-14847", "CVE-2023-30799", "CVE-2021-41653"],
  tags: ["router", "isp-cpe", "mikrotik", "exposed-mgmt"],
  fetchedAt: new Date().toISOString(),
};

export const MOCK_HISTORICAL_PORTS: Array<{
  month: string;
  ports: number[];
  delta: string;
}> = [
  { month: "2025-10", ports: [22, 80, 443, 8291], delta: "baseline" },
  { month: "2025-11", ports: [22, 80, 443, 8291, 8728], delta: "+8728 (API)" },
  { month: "2025-12", ports: [22, 80, 443, 8291, 8728, 2000], delta: "+2000 (bandwidth-test)" },
  { month: "2026-01", ports: [22, 80, 443, 8291, 8728, 2000], delta: "stable" },
  { month: "2026-02", ports: [22, 80, 443, 8291, 8728, 2000, 53], delta: "+53 (DNS open resolver)" },
  { month: "2026-03", ports: [22, 80, 443, 8291, 8728, 2000, 53, 8080], delta: "+8080 (proxy)" },
  { month: "2026-04", ports: [22, 80, 443, 8291, 8728, 2000, 53, 8080], delta: "stable" },
  { month: "2026-05", ports: [22, 80, 443, 8291, 2000, 53, 8080], delta: "-8728" },
  { month: "2026-06", ports: [22, 80, 443, 8291, 2000, 53, 8080], delta: "stable" },
  { month: "2026-07", ports: [22, 80, 443, 8291, 2000, 53, 8080, 8728], delta: "+8728 reopened" },
  { month: "2026-08", ports: [22, 80, 443, 8291, 2000, 53, 8080, 8728], delta: "stable" },
  { month: "2026-09", ports: [22, 53, 80, 443, 2000, 8080, 8291, 8728], delta: "stable" },
];

export const MOCK_BGP_PATH = [
  { asn: "AS1299", name: "Arelion (Telia Carrier)", tier: "Tier-1", country: "SE" },
  { asn: "AS3356", name: "Lumen (Level 3)", tier: "Tier-1", country: "US" },
  { asn: "AS263009", name: "WGO IX / Regional IXP", tier: "IXP", country: "BR" },
  { asn: "AS28309", name: "WGO Telecom Edge", tier: "Access", country: "BR" },
  { asn: "TARGET", name: "189.38.41.40/32", tier: "CPE", country: "BR" },
];

export const MOCK_MAID_CORRELATION = [
  {
    maid: "b8f3e2c1-77ad-4e51-9c33-a1fe2d7f0b12",
    platform: "AAID",
    lastSeen: "2026-09-11T22:14:07Z",
    lat: -16.6873,
    lng: -49.2661,
    confidence: 0.86,
    appHints: ["Instagram", "TikTok", "Uber"],
  },
  {
    maid: "9CE3F1AB-2244-4B01-8B3D-71A9F0E8E211",
    platform: "IDFA",
    lastSeen: "2026-09-12T03:41:52Z",
    lat: -16.6851,
    lng: -49.2634,
    confidence: 0.72,
    appHints: ["WhatsApp", "iFood"],
  },
  {
    maid: "d1c9a880-1a4e-4a9d-bb1e-3f0f2a4c7d99",
    platform: "AAID",
    lastSeen: "2026-09-13T18:02:11Z",
    lat: -16.6892,
    lng: -49.2649,
    confidence: 0.63,
    appHints: ["Telegram", "Twitch"],
  },
];

export function buildPacketSeries(seed = 1) {
  const out: Array<{ t: number; size: number; interArrivalMs: number; proto: string }> = [];
  let clock = 0;
  for (let i = 0; i < 60; i++) {
    const s = Math.sin((i + seed) * 0.42);
    const beacon = i % 12 === 0;
    const size = beacon
      ? 148 + Math.round(Math.abs(s) * 12)
      : 320 + Math.round(Math.abs(Math.sin(i * 0.9 + seed)) * 900);
    const gap = beacon ? 5000 : 12 + Math.round(Math.abs(Math.cos(i * 0.7)) * 55);
    clock += gap;
    out.push({
      t: clock,
      size,
      interArrivalMs: gap,
      proto: beacon ? "TCP/C2?" : i % 5 === 0 ? "UDP" : "TCP",
    });
  }
  return out;
}
