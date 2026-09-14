import { useState } from "react";
import { Activity, Download, PlayCircle, Radio, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { ApiHealth } from "@/lib/recon-types";

type Props = {
  ip: string;
  setIp: (v: string) => void;
  onRun: () => void;
  onMock: () => void;
  onExport: () => void;
  liveMode: boolean;
  setLiveMode: (v: boolean) => void;
  loading: boolean;
  riskScore: number;
  apis: ApiHealth[];
  listening: boolean;
};

export function TopBar(props: Props) {
  const { ip, setIp, onRun, onMock, onExport, liveMode, setLiveMode, loading, riskScore, apis, listening } = props;
  const [local, setLocal] = useState(ip);

  const risk =
    riskScore >= 75 ? "alert" : riskScore >= 45 ? "amber" : "neon";

  return (
    <header className="panel sticky top-0 z-30 border-b border-border/70">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-sm bg-background glow-neon">
            <Radio className="h-4 w-4 text-neon" />
          </div>
          <div className="leading-tight">
            <div className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground">Nexus-IP</div>
            <div className="text-sm font-bold tracking-wider text-neon text-glow">RECON LAB // v2.6.1</div>
          </div>
        </div>

        <div className="flex flex-1 items-center gap-2">
          <label className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Target</label>
          <Input
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={() => setIp(local)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setIp(local);
                onRun();
              }
            }}
            placeholder="0.0.0.0"
            className="h-9 w-[200px] shrink-0 border-border bg-background/70 font-mono text-sm tracking-widest text-cyan focus-visible:ring-neon"
          />
          <Button
            onClick={onRun}
            disabled={loading}
            className="h-9 gap-2 bg-neon/10 font-mono text-xs uppercase tracking-widest text-neon hover:bg-neon/20 glow-neon"
          >
            <PlayCircle className="h-4 w-4" />
            {loading ? "Scanning…" : "Start Real-Time Recon"}
          </Button>
          <Button
            variant="outline"
            onClick={onMock}
            className="h-9 gap-2 border-cyan/40 bg-transparent font-mono text-xs uppercase tracking-widest text-cyan hover:bg-cyan/10"
          >
            <Database className="h-4 w-4" />
            Load Mock Dataset
          </Button>
          <Button
            variant="outline"
            onClick={onExport}
            className="h-9 gap-2 border-border bg-transparent font-mono text-xs uppercase tracking-widest text-foreground hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            Export Forensic PDF
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 rounded-sm border border-border bg-background/60 px-3 py-1.5">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Mode</span>
            <span className={`text-[10px] font-bold ${liveMode ? "text-neon" : "text-muted-foreground"}`}>LIVE</span>
            <Switch checked={!liveMode} onCheckedChange={(v) => setLiveMode(!v)} />
            <span className={`text-[10px] font-bold ${!liveMode ? "text-alert" : "text-muted-foreground"}`}>SIM</span>
          </div>

          <div className="flex items-center gap-3">
            {apis.map((a) => (
              <div key={a.name} className="flex items-center gap-1.5" title={`${a.name} · ${a.latencyMs}ms`}>
                <span
                  className={`h-2 w-2 rounded-full live-dot ${
                    a.status === "online"
                      ? "bg-neon"
                      : a.status === "degraded"
                        ? "bg-amber"
                        : a.status === "offline"
                          ? "bg-alert"
                          : "bg-muted-foreground"
                  }`}
                />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{a.name}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-sm border border-border bg-background/60 px-3 py-1.5">
            <Activity className={`h-3.5 w-3.5 ${listening ? "text-neon live-dot" : "text-muted-foreground"}`} />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Passive Listener</span>
            <Badge variant="outline" className={`h-5 border-none px-1.5 font-mono text-[10px] ${listening ? "text-neon" : "text-muted-foreground"}`}>
              {listening ? "ARMED" : "STANDBY"}
            </Badge>
          </div>

          <RiskMeter score={riskScore} tone={risk} />
        </div>
      </div>
      {loading && (
        <div className="relative h-[2px] w-full overflow-hidden bg-border/40">
          <div className="sweep-bar absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-neon to-transparent" />
        </div>
      )}
    </header>
  );
}

function RiskMeter({ score, tone }: { score: number; tone: "neon" | "amber" | "alert" }) {
  const color = tone === "alert" ? "text-alert" : tone === "amber" ? "text-amber" : "text-neon";
  const bar = tone === "alert" ? "bg-alert" : tone === "amber" ? "bg-amber" : "bg-neon";
  return (
    <div className="flex min-w-[180px] items-center gap-2 rounded-sm border border-border bg-background/60 px-3 py-1.5">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Risk</span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${bar}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`font-mono text-sm font-bold ${color} text-glow`}>{score}</span>
    </div>
  );
}
