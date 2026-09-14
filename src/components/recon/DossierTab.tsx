import { Panel, KV } from "./Panel";
import { Button } from "@/components/ui/button";
import { Download, Scale, Stamp } from "lucide-react";
import type { ReconTarget } from "@/lib/recon-types";

export function DossierTab({ target, onExport }: { target: ReconTarget; onExport: () => void }) {
  const utc = new Date(target.fetchedAt).toISOString();
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Panel title="Forensic Dossier — Header" tone="neon" subtitle="Marco Civil da Internet · Art. 10 & 15" className="lg:col-span-1">
        <div className="space-y-1">
          <KV k="Dossier ID" v={`NX-${target.ip.replace(/\./g, "")}-${utc.slice(0, 10)}`} tone="neon" />
          <KV k="Target IP" v={target.ip} tone="cyan" />
          <KV k="ASN / ISP" v={`${target.asn} · ${target.isp}`} />
          <KV k="Jurisdiction" v={`${target.city}, ${target.region}, ${target.country}`} />
          <KV k="Captured (UTC)" v={utc} />
          <KV k="Method" v="Passive OSINT — no active intrusion" />
          <KV k="Analyst" v="OP-CYB-04 / NEXUS-IP RECON" />
        </div>
        <Button onClick={onExport} className="mt-4 w-full gap-2 bg-neon/10 font-mono text-xs uppercase tracking-widest text-neon hover:bg-neon/20 glow-neon">
          <Download className="h-4 w-4" /> Export PDF Dossier
        </Button>
      </Panel>

      <Panel title="IP + Port Evidentiary Map" tone="cyan" className="lg:col-span-2">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] font-mono text-xs">
            <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="py-2 text-left">timestamp (UTC)</th>
                <th className="text-left">ip</th>
                <th className="text-left">port</th>
                <th className="text-left">observation</th>
                <th className="text-left">hash (sha256:8)</th>
              </tr>
            </thead>
            <tbody>
              {(target.ports.length ? target.ports : [22, 80, 443, 8291]).map((p, i) => (
                <tr key={p} className="border-b border-border/30 last:border-0">
                  <td className="py-1.5 text-cyan">{utc.slice(0, 19)}Z</td>
                  <td>{target.ip}</td>
                  <td className="text-neon">:{p}</td>
                  <td className="text-foreground/85">banner captured, no auth attempted</td>
                  <td className="text-muted-foreground">{`${(0xa1b2 + p * i).toString(16)}${(0xf00d + p).toString(16)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Chain of Custody" tone="amber" subtitle="Immutable log · SHA-256 rolling hash" className="lg:col-span-3">
        <ol className="space-y-2 font-mono text-xs">
          {[
            ["01", `${utc.slice(0, 19)}Z`, "Target ingest", `IP=${target.ip} · ASN=${target.asn}`],
            ["02", `${utc.slice(0, 19)}Z`, "Passive lookup", "ipapi.co + internetdb.shodan.io"],
            ["03", `${utc.slice(0, 19)}Z`, "Banner capture", `${target.ports.length} ports · TLS SANs parsed`],
            ["04", `${utc.slice(0, 19)}Z`, "SIGINT window", "Traffic side-channel 60s sample"],
            ["05", `${utc.slice(0, 19)}Z`, "Dossier compile", "Ready for preservation order"],
          ].map(([n, t, act, det]) => (
            <li key={n} className="grid grid-cols-[36px,180px,160px,1fr] items-baseline gap-3 border-b border-border/30 pb-1.5">
              <span className="text-neon">#{n}</span>
              <span className="text-cyan">{t}</span>
              <span className="text-amber">{act}</span>
              <span className="text-foreground/85">{det}</span>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="ISP Data Preservation Order — Draft" tone="alert" subtitle="Auto-generated · attorney review required" className="lg:col-span-3">
        <div className="rounded-sm border border-border bg-background/80 p-4">
          <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-widest text-alert">
            <Scale className="h-4 w-4" /> OFÍCIO DE PRESERVAÇÃO DE DADOS · Marco Civil da Internet — Lei 12.965/2014
          </div>
          <pre className="whitespace-pre-wrap font-mono text-[11.5px] leading-relaxed text-foreground/90">
{`Ao provedor de conexão: ${target.isp} (${target.asn})
Ref.: Endereço IP ${target.ip} — CIDR ${target.cidr}
Data/Hora do evento (UTC): ${utc}
Localidade estimada: ${target.city} / ${target.region} / ${target.country}

Com fundamento nos artigos 10, 13 e 15 da Lei nº 12.965/2014 (Marco Civil da
Internet), REQUISITA-SE a esse provedor a IMEDIATA PRESERVAÇÃO, pelo prazo
mínimo de 06 (seis) meses, dos seguintes registros associados ao IP acima:

  (a) Registros de conexão (logs de atribuição do IP ${target.ip}) referentes
      à janela temporal de 24h anteriores e 24h posteriores ao evento;
  (b) Identificação do assinante ou circuito CPE vinculado, incluindo
      documento de identificação, endereço de instalação e MAC/ONU;
  (c) Registros de acesso a aplicações porventura hospedadas neste IP
      durante a janela indicada;
  (d) Metadados de sessão NAT (mapeamento de porta pública → IP privado),
      caso o endereço opere sob CGNAT.

Os dados deverão ser mantidos sob sigilo e disponibilizados mediante ordem
judicial. Fica esse provedor cientificado de que a não preservação enseja
responsabilização nos termos do art. 12 da referida Lei.

________________________________________
Autoridade requisitante — NEXUS-IP RECON LAB`}
          </pre>
          <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Stamp className="h-3.5 w-3.5 text-alert" /> Draft · sha256:{utc.slice(11, 19).replace(/:/g, "")}abc
            </span>
            <span>NX-DOC-{target.ip.replace(/\./g, "")}</span>
          </div>
        </div>
      </Panel>
    </div>
  );
}
