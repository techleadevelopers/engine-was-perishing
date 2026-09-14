import { useEffect, useMemo, useState } from "react";
import { Panel } from "./Panel";
import { buildPacketSeries } from "@/lib/recon-mock";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Scatter, ScatterChart, ZAxis } from "recharts";

export function SigintTab() {
  const [seed, setSeed] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setSeed((s) => s + 1), 2500);
    return () => clearInterval(id);
  }, []);
  const data = useMemo(() => buildPacketSeries(seed), [seed]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="Packet Size Distribution" tone="neon" subtitle="Live sample · 60 packets rolling" className="lg:col-span-2">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gNeon" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--neon)" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="var(--neon)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--grid)" strokeDasharray="2 4" />
              <XAxis dataKey="t" tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "monospace" }} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "monospace" }} />
              <Tooltip
                contentStyle={{ background: "var(--background)", border: "1px solid var(--border)", fontFamily: "monospace", fontSize: 11 }}
                labelStyle={{ color: "var(--cyan)" }}
              />
              <Area type="monotone" dataKey="size" stroke="var(--neon)" fill="url(#gNeon)" strokeWidth={1.2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Inter-Arrival Times" tone="cyan" subtitle="Beacon detection (5s heartbeat spikes)">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="var(--grid)" strokeDasharray="2 4" />
              <XAxis dataKey="t" name="ms" tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "monospace" }} />
              <YAxis dataKey="interArrivalMs" tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "monospace" }} />
              <ZAxis dataKey="size" range={[20, 200]} />
              <Tooltip
                contentStyle={{ background: "var(--background)", border: "1px solid var(--border)", fontFamily: "monospace", fontSize: 11 }}
                labelStyle={{ color: "var(--cyan)" }}
              />
              <Scatter data={data} fill="var(--cyan)" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="SIGINT Feed" tone="alert" subtitle="Passive side-channel observations">
        <div className="max-h-64 overflow-y-auto rounded-sm border border-border bg-background/80 p-2 font-mono text-[11px] leading-relaxed">
          {[
            "[SIGINT] 20:36:04Z TCP RST storm from :443 → 12 dropped",
            "[SIGINT] 20:36:06Z ICMP unreachable 3/3 - filtered upstream",
            "[SIGINT] 20:36:09Z UDP burst :4500 IKE/NAT-T candidate",
            "[SIGINT] 20:36:12Z 60s heartbeat → likely C2 beacon (94.2%)",
            "[SIGINT] 20:36:18Z DNS anomaly: version.bind reveals dnsmasq-2.80",
            "[SIGINT] 20:36:24Z entropy(payload)=7.91 — encrypted stream",
            "[SIGINT] 20:36:31Z WireGuard handshake signature @ :51820",
          ].map((l) => (
            <div key={l} className={l.includes("C2") ? "text-alert" : l.includes("WireGuard") ? "text-neon" : "text-foreground/80"}>
              {l}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
