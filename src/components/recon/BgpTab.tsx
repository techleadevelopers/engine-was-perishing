import { Panel } from "./Panel";
import { MOCK_BGP_PATH } from "@/lib/recon-mock";
import { ChevronRight, Network, GitBranch } from "lucide-react";
import type { ReconTarget } from "@/lib/recon-types";

export function BgpTab({ target }: { target: ReconTarget }) {
  const path = MOCK_BGP_PATH.map((hop, i) =>
    i === MOCK_BGP_PATH.length - 1 ? { ...hop, name: `${target.ip}/32` } : hop,
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Panel title="BGP Route & Peering Topology" tone="cyan" subtitle="Simulated upstream traversal — bgp.tools style" className="lg:col-span-3">
        <div className="relative overflow-x-auto pb-4">
          <div className="flex min-w-[900px] items-stretch gap-2">
            {path.map((hop, i) => (
              <div key={hop.asn} className="flex flex-1 items-center gap-2">
                <div className="flex-1 rounded-sm border border-border bg-background/60 p-3 transition hover:border-cyan/50 hover:glow-cyan">
                  <div className="flex items-center justify-between">
                    <span className={`font-mono text-[10px] uppercase tracking-widest ${i === path.length - 1 ? "text-alert" : "text-cyan"}`}>
                      {hop.tier}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{hop.country}</span>
                  </div>
                  <div className={`mt-1 font-mono text-sm font-bold ${i === path.length - 1 ? "text-alert text-glow" : "text-neon"}`}>{hop.asn}</div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{hop.name}</div>
                </div>
                {i < path.length - 1 && <ChevronRight className="h-5 w-5 shrink-0 text-neon/70" />}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground md:grid-cols-4">
          <Legend color="cyan" label="Tier-1 upstream" />
          <Legend color="neon" label="Regional IXP" />
          <Legend color="amber" label="Access ISP" />
          <Legend color="alert" label="Target CPE" />
        </div>
      </Panel>

      <Panel title="ASN Fingerprint" tone="neon">
        <ul className="space-y-2 font-mono text-xs">
          <Row k="origin_as" v={target.asn} tone="neon" />
          <Row k="as_name" v={target.isp} />
          <Row k="prefix" v={target.cidr} tone="cyan" />
          <Row k="rir" v="LACNIC" />
          <Row k="allocation" v="2004-11-08" />
          <Row k="peers_observed" v="17" />
          <Row k="upstream_count" v="4" />
        </ul>
      </Panel>

      <Panel title="Route Leak Detector" tone="alert" subtitle="Anomaly heuristics on AS-PATH">
        <ul className="space-y-2 text-xs">
          <Anomaly level="high" text="AS28309 announcing /22 through non-preferred transit (last 6h)." />
          <Anomaly level="med" text="AS-PATH prepend depth changed 2→4 — possible traffic shaping." />
          <Anomaly level="low" text="MOAS conflict on 189.38.40.0/22 with AS263009 (regional IXP)." />
        </ul>
      </Panel>

      <Panel title="Peering Fabric" tone="cyan" subtitle="Neighboring ASNs via passive collector">
        <div className="grid grid-cols-2 gap-2 font-mono text-[11px] md:grid-cols-3">
          {["AS1299", "AS3356", "AS6939", "AS263009", "AS53013", "AS28329", "AS264409", "AS52320", "AS264268"].map((a) => (
            <div key={a} className="flex items-center gap-2 rounded-sm border border-border bg-background/60 px-2 py-1.5">
              <GitBranch className="h-3 w-3 text-cyan" />
              <span className="text-cyan">{a}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-sm border border-cyan/20 bg-cyan/5 px-3 py-2 text-[11px] text-cyan">
          <Network className="h-3.5 w-3.5" />
          17 observed peers across 3 IXPs. Data from public route-views collectors.
        </div>
      </Panel>

      <SigintPanel />
    </div>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: "neon" | "cyan" }) {
  const color = tone === "cyan" ? "text-cyan" : tone === "neon" ? "text-neon" : "text-foreground";
  return (
    <li className="flex items-baseline justify-between border-b border-border/40 pb-1">
      <span className="text-muted-foreground">{k}</span>
      <span className={color}>{v}</span>
    </li>
  );
}

function Anomaly({ level, text }: { level: "high" | "med" | "low"; text: string }) {
  const tone = level === "high" ? "text-alert border-alert/40 bg-alert/5" : level === "med" ? "text-amber border-amber/40 bg-amber/5" : "text-cyan border-cyan/30 bg-cyan/5";
  return (
    <li className={`flex items-start gap-2 rounded-sm border px-2 py-1.5 ${tone}`}>
      <span className="font-mono text-[10px] uppercase tracking-widest">{level}</span>
      <span className="text-foreground/90">{text}</span>
    </li>
  );
}

function Legend({ color, label }: { color: "neon" | "cyan" | "amber" | "alert"; label: string }) {
  const bg = color === "neon" ? "bg-neon" : color === "cyan" ? "bg-cyan" : color === "amber" ? "bg-amber" : "bg-alert";
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${bg}`} />
      {label}
    </div>
  );
}

function SigintPanel() {
  return (
    <Panel title="AS-Path Traceroute (simulated)" tone="neon" subtitle="Hop-by-hop latency" className="lg:col-span-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] font-mono text-xs">
          <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr className="border-b border-border/60">
              <th className="py-2 text-left">hop</th>
              <th className="text-left">ip</th>
              <th className="text-left">as</th>
              <th className="text-left">rtt (ms)</th>
              <th className="text-left">loss</th>
              <th className="text-left">geo</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["01", "62.115.36.14", "AS1299", "14.2", "0%", "Stockholm, SE"],
              ["02", "4.68.63.209", "AS3356", "88.4", "0%", "Miami, US"],
              ["03", "200.219.145.10", "AS263009", "121.7", "0%", "São Paulo, BR"],
              ["04", "189.38.32.1", "AS28309", "142.6", "0.3%", "Goiânia, BR"],
              ["05", "189.38.41.40", "AS28309", "145.9", "0%", "Goiânia, BR"],
            ].map(([h, ip, as, rtt, loss, geo]) => (
              <tr key={h} className="border-b border-border/30 last:border-0 hover:bg-cyan/5">
                <td className="py-1.5 text-neon">{h}</td>
                <td className="text-cyan">{ip}</td>
                <td>{as}</td>
                <td>{rtt}</td>
                <td className={loss === "0%" ? "text-muted-foreground" : "text-amber"}>{loss}</td>
                <td className="text-muted-foreground">{geo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
