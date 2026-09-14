import type { ReconTarget } from "./recon-types";

type IpapiResponse = {
  ip: string;
  city?: string;
  region?: string;
  country_name?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  org?: string;
  asn?: string;
  network?: string;
  postal?: string;
};

type InternetDbResponse = {
  ip: string;
  ports?: number[];
  hostnames?: string[];
  cpes?: string[];
  tags?: string[];
  vulns?: string[];
};

export async function fetchLiveTarget(ip: string): Promise<ReconTarget> {
  const [ipapiRes, idbRes] = await Promise.allSettled([
    fetch(`https://ipapi.co/${ip}/json/`).then((r) => r.json() as Promise<IpapiResponse>),
    fetch(`https://internetdb.shodan.io/${ip}`).then((r) => r.json() as Promise<InternetDbResponse>),
  ]);

  const ipapi = ipapiRes.status === "fulfilled" ? ipapiRes.value : ({} as IpapiResponse);
  const idb = idbRes.status === "fulfilled" ? idbRes.value : ({} as InternetDbResponse);

  const asn = ipapi.asn ?? (ipapi.org?.match(/AS\d+/)?.[0] ?? "AS?");

  return {
    ip,
    source: "live",
    asn,
    isp: ipapi.org ?? "Unknown ISP",
    org: ipapi.org ?? "Unknown Org",
    cidr: ipapi.network ?? `${ip}/32`,
    country: ipapi.country_name ?? ipapi.country ?? "Unknown",
    region: ipapi.region ?? "—",
    city: ipapi.city ?? "—",
    latitude: ipapi.latitude ?? null,
    longitude: ipapi.longitude ?? null,
    timezone: ipapi.timezone ?? null,
    hostnames: idb.hostnames ?? [],
    ports: idb.ports ?? [],
    vulns: idb.vulns ?? [],
    tags: idb.tags ?? [],
    fetchedAt: new Date().toISOString(),
  };
}
