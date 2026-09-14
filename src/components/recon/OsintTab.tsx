import { Panel } from "./Panel";
import { MOCK_HISTORICAL_PORTS, MOCK_MAID_CORRELATION } from "@/lib/recon-mock";
import { Smartphone, MapPin } from "lucide-react";

export function OsintTab() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Panel title="Historical Port Timeline" tone="cyan" subtitle="12-month Censys/Sonar style" className="lg:col-span-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] font-mono text-xs">
            <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="py-2 text-left">month</th>
                <th className="text-left">open ports</th>
                <th className="text-left">delta</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_HISTORICAL_PORTS.map((row) => (
                <tr key={row.month} className="border-b border-border/30 last:border-0 hover:bg-cyan/5">
                  <td className="py-1.5 text-cyan">{row.month}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {row.ports.map((p) => (
                        <span key={p} className="rounded-sm border border-border bg-background/60 px-1.5 py-0.5 text-neon">
                          :{p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className={row.delta.startsWith("+") ? "text-amber" : row.delta.startsWith("-") ? "text-alert" : "text-muted-foreground"}>
                    {row.delta}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Ad-Tech (MAID) Triangulation" tone="alert" subtitle="Synthetic correlation with subnet 189.38.40.0/22" className="lg:col-span-2">
        <div className="space-y-2">
          {MOCK_MAID_CORRELATION.map((m) => (
            <div key={m.maid} className="grid grid-cols-1 gap-2 rounded-sm border border-border bg-background/60 p-3 md:grid-cols-[1fr,auto]">
              <div>
                <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-alert">
                  <Smartphone className="h-3.5 w-3.5" /> {m.platform}
                </div>
                <div className="mt-0.5 break-all font-mono text-xs text-cyan">{m.maid}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  last seen {m.lastSeen} · apps: {m.appHints.join(", ")}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="flex items-center gap-1 font-mono text-xs text-neon">
                    <MapPin className="h-3 w-3" /> {m.lat.toFixed(4)}, {m.lng.toFixed(4)}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">confidence</div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-neon/50 font-mono text-xs text-neon">
                  {(m.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="GPS Cluster Estimate" tone="neon" subtitle="Simulated heatmap centroid">
        <div className="relative h-56 overflow-hidden rounded-sm border border-border bg-background scanlines">
          <svg viewBox="0 0 200 200" className="h-full w-full">
            <defs>
              <radialGradient id="hot" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--alert)" stopOpacity="0.85" />
                <stop offset="50%" stopColor="var(--amber)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--neon)" stopOpacity="0" />
              </radialGradient>
            </defs>
            {[...Array(10)].map((_, i) => (
              <line key={`h${i}`} x1="0" x2="200" y1={i * 20} y2={i * 20} stroke="var(--grid)" strokeWidth="0.3" />
            ))}
            {[...Array(10)].map((_, i) => (
              <line key={`v${i}`} y1="0" y2="200" x1={i * 20} x2={i * 20} stroke="var(--grid)" strokeWidth="0.3" />
            ))}
            <circle cx="100" cy="100" r="70" fill="url(#hot)" />
            {MOCK_MAID_CORRELATION.map((m, i) => (
              <circle key={m.maid} cx={90 + i * 12} cy={95 + i * 6} r="2.5" fill="var(--neon)" />
            ))}
            <text x="8" y="192" fontFamily="monospace" fontSize="8" fill="var(--muted-foreground)">
              cluster σ ≈ 280m · n=3 devices · 189.38.40.0/22
            </text>
          </svg>
        </div>
      </Panel>

      <Panel title="Protocol Classifier (AI/Heuristic)" tone="cyan" subtitle="Passive DPI-lite" className="lg:col-span-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Classifier label="C2 Beaconing" match={94.2} note="60s heartbeats, low-entropy TCP" tone="alert" />
          <Classifier label="VoIP / Media Stream" match={71.5} note="UDP bursts 20ms, 172-byte payloads" tone="cyan" />
          <Classifier label="Encrypted VPN Tunnel" match={82.0} note="WireGuard handshake signature" tone="neon" />
        </div>
      </Panel>
    </div>
  );
}

function Classifier({ label, match, note, tone }: { label: string; match: number; note: string; tone: "neon" | "cyan" | "alert" }) {
  const color = tone === "alert" ? "text-alert" : tone === "cyan" ? "text-cyan" : "text-neon";
  const bar = tone === "alert" ? "bg-alert" : tone === "cyan" ? "bg-cyan" : "bg-neon";
  return (
    <div className="rounded-sm border border-border bg-background/60 p-3">
      <div className="flex items-baseline justify-between">
        <span className={`font-mono text-xs uppercase tracking-widest ${color}`}>{label}</span>
        <span className={`font-mono text-lg font-bold ${color} text-glow`}>{match.toFixed(1)}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${bar}`} style={{ width: `${match}%` }} />
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">{note}</div>
    </div>
  );
}
