# NEXUS-IP Recon Lab — Arquitetura de Backend Real

> Documento de engenharia para migrar o painel (hoje front-end + mocks + duas APIs públicas) para uma operação real de Cyber Threat Intelligence & IP Forensics de alta performance, com validade jurídica (Marco Civil da Internet, Art. 10 e 15).

---

## 1. Stack Recomendada (High Performance)

| Camada | Tecnologia | Motivo |
|---|---|---|
| **Engine de Recon & Ingestão (Core)** | **Go (Golang)** ou **Rust** | Concorrência nativa (Goroutines / async tasks), consumo mínimo de memória, raw sockets, varreduras assíncronas sem bloqueio. |
| **Storage & Grafo de Correlação** | **PostgreSQL + Apache AGE** ou **Memgraph / Neo4j** | Correlaciona IPs, ASNs BGP, wallets, hashes de CPF e fingerprints como grafo — clusters de ataque em consultas de baixa latência. |
| **Message Broker / Telemetria em Tempo Real** | **NATS.io** ou **Redis Pub/Sub** | Milhões de eventos/s, latência sub-ms, distribui SIGINT/telemetria para o painel via WebSockets. |
| **Front-end / Dashboard** | **Next.js (React) + TailwindCSS + Zustand + Recharts / Cytoscape.js** | Estado leve para fluxos em tempo real, renderização eficiente de grafos BGP. *(o protótipo atual está em TanStack Start + React — a stack proposta aqui é o alvo de produção)* |
| **Runtime / Deploy** | Docker + Kubernetes (ou Nomad) em VPS/bare-metal com IP dedicado | Raw sockets exigem `CAP_NET_RAW`; edge serverless (Workers/Lambda) **não serve**. |
| **Observabilidade** | Prometheus + Grafana + Loki + OpenTelemetry | Métricas de probe, tracing distribuído, audit trail. |

---

## 2. Front-end Puro vs. Stack Dedicada

| Atributo | Front-end Puro (browser) | Engine Dedicada (Go/Rust + DB) |
|---|---|---|
| CORS / Network | Alta limitação (navegador bloqueia raw sockets e chamadas de baixo nível) | Nenhuma — servidor executa chamadas diretas |
| Active Banner Grabbing | Limitado a APIs de terceiros | TCP/TLS nativo com handshake completo |
| Processamento de SIGINT | Simulação em memória no cliente | PCAPs / flow logs processados em paralelo em tempo real |
| Persistência | LocalStorage / memória | Relacional + grafo com audit trail |
| Rate limits | Herda os das APIs públicas | Controlados internamente |
| Validade forense | Nenhuma | Cadeia de custódia + timestamps assinados |

---

## 3. Arquitetura de Comunicação

```text
  [ Dispositivos / Sensores / APIs Externas ]
                 │
                 ▼
     ┌───────────────────────────────┐
     │   Core Engine — Go / Rust     │
     │  Probe TCP · BGP RDAP · TLS   │
     │  PCAP · WHOIS · Ad-Tech feeds │
     └───────────────────────────────┘
                 │
                 ├─► [ PostgreSQL + AGE / Memgraph ]   (persistência + grafos)
                 │
                 ├─► [ Object Storage (S3/MinIO) ]     (PCAPs, evidências)
                 │
                 └─► [ NATS / Redis Pub/Sub ]
                         │
                         ▼
                 [ Gateway WebSocket (wss://) ]
                         │
                         ▼
              [ Dashboard NEXUS-IP Recon ]
              (visualização em tempo real)
```

---

## 4. Módulos do Sistema de Ingestão

### 4.1 Ingestor de Banners TCP/TLS de baixo nível

Em vez de depender só de APIs de terceiros (rate limits, dados desatualizados), a engine Go faz o handshake TCP/TLS direto nas portas alvo e extrai a cadeia de certificados (SANs, CN, issuer):

```go
package recon

import (
    "crypto/tls"
    "fmt"
    "net"
    "time"
)

type TargetBanner struct {
    Port        int      `json:"port"`
    Service     string   `json:"service"`
    Banner      string   `json:"banner"`
    CertSubject string   `json:"cert_subject,omitempty"`
    SANs        []string `json:"sans,omitempty"`
}

func InspectPort(ip string, port int) (*TargetBanner, error) {
    address := fmt.Sprintf("%s:%d", ip, port)
    conn, err := net.DialTimeout("tcp", address, 3*time.Second)
    if err != nil {
        return nil, err
    }
    defer conn.Close()

    buf := make([]byte, 1024)
    conn.SetReadDeadline(time.Now().Add(2 * time.Second))
    n, _ := conn.Read(buf)

    result := &TargetBanner{Port: port, Banner: string(buf[:n])}

    if port == 443 || port == 8443 {
        tlsConn := tls.Client(conn, &tls.Config{InsecureSkipVerify: true})
        if err := tlsConn.Handshake(); err == nil {
            state := tlsConn.ConnectionState()
            if len(state.PeerCertificates) > 0 {
                cert := state.PeerCertificates[0]
                result.CertSubject = cert.Subject.CommonName
                result.SANs = cert.DNSNames
            }
        }
    }
    return result, nil
}
```

### 4.2 Coletor BGP / RDAP / WHOIS
- Consome feeds do RIPEstat, RouteViews, PeeringDB.
- Constrói caminho AS→AS e armazena como arestas no grafo.

### 4.3 Sensor SIGINT (passivo)
- `libpcap` / `AF_PACKET` (Linux) para captura.
- Extrai tamanho de pacote, inter-arrival, entropia de payload, assinaturas de handshake (WireGuard, IKE, TLS ClientHello).

### 4.4 Correlator OSINT / Ad-Tech
- Ingesta feeds de MAID (AAID/IDFA), leaks públicos, pastebins.
- Faz join no grafo por IP + janela temporal + geohash.

### 4.5 Motor de Risk Score
- Modelo ponderado: CVEs expostas × exposição de portas mgmt × idade da última rotação de chave × reputação do ASN.
- Publicado no NATS a cada mudança material.

### 4.6 Gerador de Dossiê Forense
- Renderiza PDF assinado (PAdES) com timestamp RFC 3161.
- Preserva hash SHA-256 de cada evidência + cadeia de custódia.
- Emite draft automático de Ofício de Preservação de Dados para o ISP.

---

## 5. Modelo de Dados (resumo)

**Relacional (PostgreSQL)**
- `targets(ip, asn, cidr, first_seen, last_seen)`
- `probes(id, target_ip, port, proto, banner, cert_json, observed_at)`
- `vulns(target_ip, cve, confidence, source)`
- `evidence(id, kind, sha256, storage_uri, captured_at, signed_by)`
- `audit_log(actor, action, target, at, ip, user_agent)` — append-only.

**Grafo (AGE / Memgraph)**
- Nós: `IP`, `ASN`, `Domain`, `Cert`, `MAID`, `Wallet`, `CPFHash`.
- Arestas: `ANNOUNCES`, `RESOLVES_TO`, `SIGNED_BY`, `CO_LOCATED`, `SEEN_WITH`.

---

## 6. Contratos de API

### 6.1 REST (controle)
```
POST /v1/recon           { ip }                 → { job_id }
GET  /v1/target/:ip                             → snapshot completo
GET  /v1/target/:ip/dossier.pdf                 → PDF assinado
POST /v1/legal/preservation-order { ip, case }  → draft de ofício
```

### 6.2 WebSocket (stream)
```
wss://api.nexus/ws?target=189.38.41.40

← { type: "probe",  port: 443, banner: "...", sans: [...] }
← { type: "sigint", ts: 173..., size: 148, iat_ms: 5000, proto: "TCP" }
← { type: "risk",   score: 93, delta: +2 }
```

O front-end atual (mock) já consome eventos nesse formato — basta trocar a fonte de dados para o WebSocket real.

---

## 7. Segurança & Compliance (Marco Civil — Art. 10 e 15)

- **Auditoria**: toda ação de operador em `audit_log` append-only, retenção mínima 6 meses.
- **Timestamps**: UTC + RFC 3161 (autoridade de carimbo de tempo externa).
- **Autorização**: RBAC (analista / supervisor / perito). MFA obrigatório.
- **Escopo legal**: whitelist de alvos autorizados por ordem judicial; probes bloqueados fora do escopo.
- **Cadeia de custódia**: cada evidência tem hash SHA-256, assinatura do coletor e URI imutável (object lock).
- **LGPD**: dados pessoais (CPF, MAID) só como hash; chave de reidentificação sob custódia separada.

---

## 8. Deploy — Próximos Passos Operacionais

1. **Borda dedicada** — subir o engine Go/Rust em VPS/bare-metal isolado (não serverless), com `CAP_NET_RAW` e IP reverso próprio.
2. **Contêiner** — Dockerfile multi-stage; `distroless` na imagem final; `seccomp` restrito.
3. **Broker** — NATS JetStream com persistência para replay de eventos.
4. **Banco** — PostgreSQL 16 + extensão AGE; réplica read-only para consultas do painel.
5. **WebSocket Gateway** — Go (`nhooyr/websocket`) ou Rust (`tokio-tungstenite`) atrás de TLS (wss://).
6. **Integração do front-end** — substituir as chamadas REST/mocks do painel Lovable por assinatura WebSocket; manter fallback REST para snapshot inicial.
7. **Pipeline forense** — job noturno consolida evidências do dia em PDF assinado + envia ao cofre.
8. **Runbook legal** — template de ofício de preservação, fluxo de aprovação, retenção e descarte.

---

## 9. Roadmap de Migração (a partir do protótipo atual)

| Fase | Entrega | Estado |
|---|---|---|
| 0 | Protótipo visual + mocks + 2 APIs públicas (ipapi, InternetDB) | **feito** |
| 1 | Engine Go — probe TCP/TLS + WHOIS/RDAP + persistência PG | pendente |
| 2 | Grafo AGE + correlator OSINT | pendente |
| 3 | Sensor SIGINT passivo + NATS + WebSocket gateway | pendente |
| 4 | Dossiê PDF assinado + ofício de preservação | pendente |
| 5 | RBAC + MFA + audit trail + whitelist de escopo | pendente |
