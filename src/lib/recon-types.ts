export type PortRecord = {
  port: number;
  proto: string;
  service: string;
  banner: string[];
};

export type ReconTarget = {
  ip: string;
  source: "live" | "mock";
  asn: string;
  isp: string;
  org: string;
  cidr: string;
  country: string;
  region: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  hostnames: string[];
  ports: number[];
  vulns: string[];
  tags: string[];
  fetchedAt: string;
};

export type ApiHealth = {
  name: string;
  status: "online" | "degraded" | "offline" | "idle";
  latencyMs: number;
};
