import { AlertTriangle, Globe2, ShieldAlert, Server, MapPin, Clock } from "lucide-react";
import { Panel, KV } from "./Panel";
import { Badge } from "@/components/ui/badge";
import type { ReconTarget } from "@/lib/recon-types";

export function OverviewTab({ target, riskScore }: { target: ReconTarget; riskScore: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Panel title="Target Identity" tone="neon" subtitle="ipapi.co / internetdb.shodan.io" className="lg:col-span-1">
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <Server className="h-4 w-4 text-neon" />
            <span className="font-mono text-2xl font-bold tracking-widest text-neon text-glow">{target.ip}</span>
          </div>
          <div className="mt-3 space-y-1">
            <KV k="ASN" v={<span>{target.asn}</span>} tone="cyan" />
            <KV k="ISP / Org" v={target.isp} />
            <KV k="CIDR" v={target.cidr} tone="cyan" />
            <KV k="Country" v={target.country} />
            <KV k="Region" v={target.region} />
            <KV k="City" v={target.city} />
            <KV k="Timezone" v={target.timezone ?? "—"} />
          </div>
        </div>
      </Panel>

      <Panel title="Threat Posture" tone={riskScore >= 75 ? "alert" : riskScore >= 45 ? "amber" : "neon"} subtitle="Composite score across exposure, vulns, tags">
        <div className="flex items-center gap-4">
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-border">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(var(--${riskScore >= 75 ? "alert" : riskScore >= 45 ? "amber" : "neon"}) ${
                  riskScore * 3.6
                }deg, transparent 0deg)`,
                mask: "radial-gradient(circle, transparent 55%, black 56%)",
                WebkitMask: "radial-gradient(circle, transparent 55%, black 56%)",
              }}
            />
            <div className="text-center">
              <div className={`font-mono text-3xl font-bold ${riskScore >= 75 ? "text-alert" : riskScore >= 45 ? "text-amber" : "text-neon"} text-glow`}>
                {riskScore}
              </div>
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">/ 100</div>
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            <PostureRow label="Exposed Ports" value={target.ports.length} danger={target.ports.length > 5} />
            <PostureRow label="Known Vulns" value={target.vulns.length} danger={target.vulns.length > 0} />
            <PostureRow label="Hostnames leaked" value={target.hostnames.length} danger={target.hostnames.length > 1} />
            <PostureRow label="Behavior tags" value={target.tags.length} danger={target.tags.includes("router")} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {target.tags.length === 0 && <span className="text-xs text-muted-foreground">No behavioral tags returned</span>}
          {target.tags.map((t) => (
            <Badge key={t} variant="outline" className="border-cyan/40 bg-cyan/5 font-mono text-[10px] uppercase tracking-widest text-cyan">
              {t}
            </Badge>
          ))}
        </div>
      </Panel>

      <Panel title="CVE Watchlist" tone="alert" subtitle="Cross-referenced Shodan InternetDB">
        {target.vulns.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldAlert className="h-4 w-4" /> No known CVEs surfaced from passive lookup.
          </div>
        ) : (
          <ul className="space-y-2">
            {target.vulns.map((v) => (
              <li key={v} className="flex items-center justify-between gap-2 rounded-sm border border-alert/30 bg-alert/5 px-3 py-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-alert" />
                  <span className="font-mono text-sm text-alert text-glow">{v}</span>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">CRITICAL</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Geolocation" tone="cyan" subtitle="Reverse geo from IPinfo/ipapi" className="lg:col-span-2">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="relative h-56 overflow-hidden rounded-sm border border-border bg-background scanlines">
            <svg viewBox="0 0 400 220" className="h-full w-full">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--grid)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="400" height="220" fill="url(#grid)" />
              <path d="M40,120 Q120,60 220,110 T380,90" stroke="var(--cyan)" strokeWidth="0.6" fill="none" opacity="0.6" />
              <path d="M20,160 Q140,140 240,170 T390,150" stroke="var(--neon)" strokeWidth="0.6" fill="none" opacity="0.5" />
              <circle cx="230" cy="130" r="18" fill="none" stroke="var(--alert)" strokeWidth="1" opacity="0.6">
                <animate attributeName="r" from="6" to="26" dur="1.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.9" to="0" dur="1.6s" repeatCount="indefinite" />
              </circle>
              <circle cx="230" cy="130" r="4" fill="var(--alert)" />
              <text x="240" y="126" fill="var(--alert)" fontFamily="monospace" fontSize="10">
                {target.city}
              </text>
            </svg>
          </div>
          <div className="space-y-1">
            <KV k="Latitude" v={target.latitude?.toFixed(4) ?? "—"} tone="cyan" />
            <KV k="Longitude" v={target.longitude?.toFixed(4) ?? "—"} tone="cyan" />
            <KV k="Country" v={target.country} />
            <KV k="Region" v={target.region} />
            <KV k="City" v={target.city} tone="neon" />
            <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 text-cyan" /> Geo coordinates are ISP-registered, not device-precise.
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Recon Metadata" tone="neon">
        <div className="space-y-1">
          <KV k="Source" v={target.source === "live" ? "LIVE FEED" : "MOCK DATASET"} tone={target.source === "live" ? "neon" : "cyan"} />
          <KV k="Fetched" v={new Date(target.fetchedAt).toISOString().replace("T", " ").slice(0, 19) + "Z"} />
          <KV k="Hostnames" v={target.hostnames.length} />
          <KV k="Ports found" v={target.ports.length} tone="cyan" />
          <KV k="Tags" v={target.tags.length} />
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-sm border border-neon/20 bg-neon/5 px-3 py-2 text-[11px] text-neon">
          <Globe2 className="h-3.5 w-3.5" />
          Passive-only lookup. No packets sent to target.
          <Clock className="ml-auto h-3.5 w-3.5" />
        </div>
      </Panel>
    </div>
  );
}

function PostureRow({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-1 last:border-0">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className={`font-mono text-sm ${danger ? "text-alert text-glow" : "text-neon"}`}>{value.toString().padStart(2, "0")}</span>
    </div>
  );
}
