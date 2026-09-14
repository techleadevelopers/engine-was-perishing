import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TopBar } from "@/components/recon/TopBar";
import { OverviewTab } from "@/components/recon/OverviewTab";
import { BgpTab } from "@/components/recon/BgpTab";
import { PortsTab } from "@/components/recon/PortsTab";
import { SigintTab } from "@/components/recon/SigintTab";
import { OsintTab } from "@/components/recon/OsintTab";
import { DossierTab } from "@/components/recon/DossierTab";
import { DEFAULT_IP, MOCK_TARGET } from "@/lib/recon-mock";
import { fetchLiveTarget } from "@/lib/recon-api";
import type { ApiHealth, ReconTarget } from "@/lib/recon-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEXUS-IP Recon Lab — Cyber Threat Intelligence & IP Forensics" },
      {
        name: "description",
        content:
          "Military-grade cyber threat intelligence & IP forensics laboratory. Passive ASN/BGP recon, port banner grabbing, SSL/TLS SAN analysis, SIGINT side-channel, OSINT ad-tech correlation and legal forensic dossier generation.",
      },
      { property: "og:title", content: "NEXUS-IP Recon Lab" },
      { property: "og:description", content: "Passive IP forensics console with BGP topology, port banners, SIGINT & legal dossier." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReconLab,
});

const INITIAL_APIS: ApiHealth[] = [
  { name: "bgp.tools", status: "online", latencyMs: 42 },
  { name: "shodan/idb", status: "online", latencyMs: 88 },
  { name: "ipinfo", status: "online", latencyMs: 66 },
  { name: "censys", status: "degraded", latencyMs: 210 },
];

function computeRisk(t: ReconTarget): number {
  let s = 15;
  s += Math.min(30, t.ports.length * 4);
  s += Math.min(30, t.vulns.length * 12);
  if (t.tags.includes("router") || t.tags.includes("iot")) s += 12;
  if (t.hostnames.length > 1) s += 6;
  return Math.min(100, s);
}

function ReconLab() {
  const [ip, setIp] = useState(DEFAULT_IP);
  const [liveMode, setLiveMode] = useState(true);
  const [target, setTarget] = useState<ReconTarget>(MOCK_TARGET);
  const [loading, setLoading] = useState(false);
  const [apis, setApis] = useState<ApiHealth[]>(INITIAL_APIS);
  const [listening, setListening] = useState(true);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    const id = setInterval(() => {
      setApis((prev) =>
        prev.map((a) => ({
          ...a,
          latencyMs: Math.max(20, a.latencyMs + Math.round((Math.random() - 0.5) * 30)),
        })),
      );
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const runRecon = useCallback(async () => {
    setLoading(true);
    setListening(true);
    try {
      if (liveMode) {
        toast.message("Recon initiated", { description: `Passive lookup on ${ip}` });
        const t = await fetchLiveTarget(ip);
        setTarget(t);
        toast.success("Recon complete", { description: `${t.ports.length} ports · ${t.vulns.length} CVEs` });
      } else {
        await new Promise((r) => setTimeout(r, 700));
        setTarget({ ...MOCK_TARGET, ip, fetchedAt: new Date().toISOString() });
        toast.warning("SIM MODE", { description: "Heavy-attack mock dataset loaded" });
      }
    } catch (e) {
      toast.error("Recon failed", { description: (e as Error).message });
      setApis((prev) => prev.map((a) => (a.name === "shodan/idb" ? { ...a, status: "offline" } : a)));
    } finally {
      setLoading(false);
    }
  }, [ip, liveMode]);

  const loadMock = useCallback(() => {
    setTarget({ ...MOCK_TARGET, ip, fetchedAt: new Date().toISOString() });
    toast.success("Mock dataset loaded", { description: "Heavy-attack profile · CVE chain injected" });
  }, [ip]);

  const exportPdf = useCallback(() => {
    const dossier = {
      dossier_id: `NX-${target.ip.replace(/\./g, "")}-${target.fetchedAt.slice(0, 10)}`,
      generated_utc: new Date().toISOString(),
      target,
      compliance: "Marco Civil da Internet · Art. 10/15",
    };
    const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dossier.dossier_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Dossier exported", { description: "Forensic package ready for submission" });
  }, [target]);

  const riskScore = useMemo(() => computeRisk(target), [target]);

  return (
    <div className="min-h-screen">
      <Toaster />
      <TopBar
        ip={ip}
        setIp={setIp}
        onRun={runRecon}
        onMock={loadMock}
        onExport={exportPdf}
        liveMode={liveMode}
        setLiveMode={setLiveMode}
        loading={loading}
        riskScore={riskScore}
        apis={apis}
        listening={listening}
      />

      <main className="mx-auto max-w-[1600px] px-4 py-4">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="mb-4 h-auto w-full justify-start gap-1 rounded-sm border border-border bg-background/60 p-1">
            {(
              [
                { v: "overview", label: "01 · Overview & Risk" },
                { v: "bgp", label: "02 · BGP & Network SIGINT" },
                { v: "ports", label: "03 · Port Banners & SSL SANs" },
                { v: "sigint", label: "04 · Passive SIGINT" },
                { v: "osint", label: "05 · OSINT & Ad-Tech" },
                { v: "dossier", label: "06 · Legal Forensic Dossier" },
              ] as const
            ).map(({ v, label }) => (
              <TabsTrigger
                key={v}
                value={v}
                className="rounded-sm px-3 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground data-[state=active]:bg-neon/10 data-[state=active]:text-neon data-[state=active]:glow-neon"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            <OverviewTab target={target} riskScore={riskScore} />
          </TabsContent>
          <TabsContent value="bgp" className="mt-0">
            <BgpTab target={target} />
          </TabsContent>
          <TabsContent value="ports" className="mt-0">
            <PortsTab target={target} />
          </TabsContent>
          <TabsContent value="sigint" className="mt-0">
            <SigintTab />
          </TabsContent>
          <TabsContent value="osint" className="mt-0">
            <OsintTab />
          </TabsContent>
          <TabsContent value="dossier" className="mt-0">
            <DossierTab target={target} onExport={exportPdf} />
          </TabsContent>
        </Tabs>

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>NEXUS-IP RECON LAB · v2.6.1 · classification: OPS-INTERNAL</span>
          <span>passive-only · no packets sent to target · logs sha-256 chained</span>
        </footer>
      </main>
    </div>
  );
}
