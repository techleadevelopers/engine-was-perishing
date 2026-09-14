# NEXUS-IP Recon Lab — Backend (Go Engine)

Backend de alta performance para a plataforma **NEXUS-IP Recon Lab**.
Este diretório contém apenas o **código-fonte e a configuração**;
nenhuma dependência é instalada e nenhum serviço é executado a partir
daqui. Use este README + `docs/BACKEND_ARCHITECTURE.md` como guia para
levantar a stack em ambiente próprio (Docker/K8s).

## Stack

- **Linguagem:** Go 1.22+
- **HTTP:** `net/http` + `chi` router
- **WebSockets:** `nhooyr.io/websocket`
- **DB:** PostgreSQL 16 + extensão Apache AGE (grafo)
- **Broker:** NATS JetStream
- **Cache:** Redis
- **Object Storage:** S3-compatível (MinIO)
- **Observabilidade:** OpenTelemetry + Prometheus

## Layout

```
backend/
├── cmd/
│   ├── api/           # API HTTP + WebSocket gateway
│   └── ingestor/      # Worker de recon (TCP/TLS, BGP, SIGINT)
├── internal/
│   ├── api/           # Handlers HTTP
│   ├── auth/          # JWT + RBAC + MFA
│   ├── recon/         # Orquestrador de jobs de recon
│   ├── bgp/           # BGP/ASN/RDAP/WHOIS
│   ├── sigint/        # Traffic side-channel / heurísticas
│   ├── osint/         # Correlação OSINT / MAID
│   ├── dossier/       # Geração de PDF forense + selo temporal
│   ├── risk/          # Motor de risk scoring
│   ├── storage/       # Postgres + AGE + S3
│   ├── broker/        # NATS publisher/subscriber
│   ├── ws/            # Gateway WebSocket em tempo real
│   └── audit/         # Trilha de auditoria append-only
├── pkg/models/        # Structs compartilhados
├── migrations/        # SQL migrations (goose format)
└── deploy/            # Dockerfile + K8s manifests
```

## Como levantar (fora deste sandbox)

```bash
cd backend
go mod tidy
docker compose -f deploy/docker-compose.yml up -d postgres nats redis minio
go run ./cmd/api
go run ./cmd/ingestor
```

Consulte `docs/BACKEND_ARCHITECTURE.md` para arquitetura completa,
modelo de dados, contratos REST/WebSocket, e conformidade LGPD /
Marco Civil da Internet (Art. 10/15).
