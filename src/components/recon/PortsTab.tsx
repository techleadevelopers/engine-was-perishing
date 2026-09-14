import { Panel, KV } from "./Panel";
import { Terminal, Lock, KeyRound } from "lucide-react";
import type { ReconTarget } from "@/lib/recon-types";

const BANNERS: Record<number, { service: string; lines: string[] }> = {
  22: {
    service: "SSH",
    lines: [
      "$ nc -v 189.38.41.40 22",
      "SSH-2.0-OpenSSH_7.4p1 Debian-10+deb9u7",
      "kex_algorithms: curve25519-sha256,diffie-hellman-group14-sha256",
      "server_host_key_algorithms: ssh-rsa,rsa-sha2-512,ssh-ed25519",
      "[FINGERPRINT] ED25519 SHA256:9nBQKhCg1WgQx8mZ7l3f/x9Hs4A2Nq0YrPqzWJmDkQ4",
      "[FINGERPRINT] RSA    SHA256:pM7oe0/y5+Twm3Yz3q9hHfC5N1v0kV6bJmU2xLc9tRk",
    ],
  },
  80: {
    service: "HTTP",
    lines: [
      "$ curl -I http://189.38.41.40/",
      "HTTP/1.1 401 Unauthorized",
      "Server: WGO-ONT-GW/2.4.1 (embedded)",
      "WWW-Authenticate: Basic realm=\"WGO Router Admin\"",
      "X-Powered-By: MikroTik-RouterOS/6.48.6",
      "Set-Cookie: sess=1a2b3c; HttpOnly",
    ],
  },
  443: {
    service: "HTTPS",
    lines: [
      "$ openssl s_client -connect 189.38.41.40:443 -servername gw.wgo-internal.net",
      "subject=/CN=gw.wgo-internal.net/emailAddress=admin@wgo-internal.net",
      "issuer=/CN=WGO Internal CA (self-signed)",
      "notBefore=Jan  4 12:00:00 2025 GMT",
      "notAfter =Jan  4 12:00:00 2027 GMT",
      "SAN: DNS:gw.wgo-internal.net, DNS:cpe.wgotelecom.com.br, IP:189.38.41.40, email:admin@wgo-internal.net",
      "cipher: TLS_AES_128_GCM_SHA256 / TLSv1.3",
    ],
  },
  8291: {
    service: "MikroTik Winbox",
    lines: [
      "$ nmap -p8291 --script mikrotik-routeros-brute 189.38.41.40",
      "8291/tcp open  winbox",
      "| mikrotik-routeros: RouterOS 6.48.6 (long-term)",
      "| system-identity: WGO-EDGE-04",
      "| architecture: mipsbe",
      "|_ board-name: RB750Gr3 hEX",
      "[CVE-2018-14847] Winbox path traversal candidate  ← high confidence",
    ],
  },
  8728: {
    service: "RouterOS API",
    lines: [
      "$ nc -v 189.38.41.40 8728",
      "!done",
      "=version=6.48.6",
      "=build-time=Mar/22/2024 12:14:52",
      "=board-name=RB750Gr3",
      "[warn] RouterOS API exposed to WAN — auth bruteforce surface",
    ],
  },
  53: {
    service: "DNS",
    lines: [
      "$ dig @189.38.41.40 version.bind chaos txt",
      ";; ANSWER SECTION:",
      "version.bind. 0 CH TXT \"dnsmasq-2.80\"",
      "recursion: available (open resolver)",
    ],
  },
  2000: { service: "MikroTik Bandwidth", lines: ["$ nc -v 189.38.41.40 2000", "connection established — bandwidth-test server", "protocol: btest v2 (unauthenticated probe)"] },
  8080: { service: "HTTP-Proxy", lines: ["$ curl -I http://189.38.41.40:8080/", "HTTP/1.1 403 Forbidden", "Server: MikroTik HttpProxy", "Via: 1.1 wgo-proxy.internal"] },
};

export function PortsTab({ target }: { target: ReconTarget }) {
  const ports = target.ports.length ? target.ports : Object.keys(BANNERS).map(Number);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Panel title="Exposed Port Matrix" tone="neon" subtitle={`${ports.length} ports observed`} className="lg:col-span-1">
        <ul className="space-y-1.5">
          {ports.map((p) => {
            const b = BANNERS[p];
            return (
              <li key={p} className="flex items-center justify-between rounded-sm border border-border bg-background/60 px-2 py-1.5">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-neon text-glow">:{p}</span>
                  <span className="text-muted-foreground">{b?.service ?? "unknown"}</span>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-cyan">tcp</span>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="Banner Inspector Terminal" tone="cyan" subtitle="Passive grabs — no active auth" className="lg:col-span-2">
        <div className="max-h-[520px] space-y-4 overflow-y-auto pr-1">
          {ports.map((p) => {
            const b = BANNERS[p] ?? { service: "unknown", lines: [`$ probe ${target.ip}:${p}`, "no banner recorded"] };
            return (
              <div key={p} className="rounded-sm border border-border bg-background/80 scanlines">
                <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-3 py-1.5">
                  <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-cyan">
                    <Terminal className="h-3.5 w-3.5" /> port :{p} — {b.service}
                  </div>
                  <span className="text-[10px] text-muted-foreground">tty/pts-{p}</span>
                </div>
                <pre className="overflow-x-auto p-3 font-mono text-[11px] leading-relaxed text-neon">
                  {b.lines.map((l, i) => (
                    <div
                      key={i}
                      className={
                        l.startsWith("$")
                          ? "text-cyan"
                          : l.includes("CVE") || l.toLowerCase().includes("warn")
                            ? "text-alert"
                            : l.startsWith("[FINGERPRINT]")
                              ? "text-amber"
                              : "text-foreground/85"
                      }
                    >
                      {l}
                    </div>
                  ))}
                </pre>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="TLS Certificate Analyzer" tone="amber" subtitle="Port 443 · self-signed" className="lg:col-span-2">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <KV k="Common Name" v="gw.wgo-internal.net" tone="cyan" />
            <KV k="Issuer" v="WGO Internal CA (self-signed)" tone="alert" />
            <KV k="Serial" v="0x1a3f:8892:22ee:0104" />
            <KV k="Sig Algo" v="sha256WithRSAEncryption" />
            <KV k="Valid From" v="2025-01-04T12:00:00Z" />
            <KV k="Valid Until" v="2027-01-04T12:00:00Z" tone="neon" />
          </div>
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-amber">
              <Lock className="h-3 w-3" /> Subject Alt Names — leaked identifiers
            </div>
            <ul className="space-y-1 font-mono text-xs">
              {[
                "DNS: gw.wgo-internal.net",
                "DNS: cpe.wgotelecom.com.br",
                "DNS: mgmt-04.wgo-internal.net",
                "IP:  189.38.41.40",
                "email: admin@wgo-internal.net",
                "URI: winbox://admin@189.38.41.40:8291",
              ].map((s) => (
                <li key={s} className="rounded-sm border border-border bg-background/60 px-2 py-1 text-cyan">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Panel>

      <Panel title="Host Key Fingerprints" tone="neon">
        <ul className="space-y-2 font-mono text-[11px]">
          <li className="rounded-sm border border-border bg-background/60 p-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-neon">
              <KeyRound className="h-3 w-3" /> ED25519
            </div>
            <div className="mt-1 break-all text-cyan">SHA256:9nBQKhCg1WgQx8mZ7l3f/x9Hs4A2Nq0YrPqzWJmDkQ4</div>
          </li>
          <li className="rounded-sm border border-border bg-background/60 p-2">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-neon">
              <KeyRound className="h-3 w-3" /> RSA-2048
            </div>
            <div className="mt-1 break-all text-cyan">SHA256:pM7oe0/y5+Twm3Yz3q9hHfC5N1v0kV6bJmU2xLc9tRk</div>
          </li>
          <li className="rounded-sm border border-alert/40 bg-alert/5 p-2 text-alert">
            Both keys observed on 4 unrelated hosts in AS28309 → shared factory keys.
          </li>
        </ul>
      </Panel>
    </div>
  );
}
