-- +goose Up
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- Ative Apache AGE em produção para grafo de correlação:
-- CREATE EXTENSION IF NOT EXISTS age;

CREATE TABLE users (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email        TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,               -- Argon2id
    totp_secret  TEXT NOT NULL,
    roles        TEXT[] NOT NULL DEFAULT '{analyst}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE authorized_targets (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cidr      CIDR NOT NULL,
    reason    TEXT NOT NULL,
    added_by  UUID REFERENCES users(id),
    added_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE recon_jobs (
    id            UUID PRIMARY KEY,
    target_ip     INET NOT NULL,
    mode          TEXT NOT NULL,
    status        TEXT NOT NULL,
    requested_by  TEXT NOT NULL,
    case_id       TEXT,
    created_at    TIMESTAMPTZ NOT NULL,
    finished_at   TIMESTAMPTZ
);
CREATE INDEX recon_jobs_ip_idx ON recon_jobs(target_ip);

CREATE TABLE target_snapshots (
    ip         INET PRIMARY KEY,
    data       JSONB NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX target_snapshots_data_idx ON target_snapshots USING GIN (data);

CREATE TABLE evidence (
    id         UUID PRIMARY KEY,
    case_id    TEXT NOT NULL,
    kind       TEXT NOT NULL,
    sha256     TEXT NOT NULL,
    s3_key     TEXT NOT NULL,
    tsa_token  BYTEA,
    created_at TIMESTAMPTZ NOT NULL,
    created_by TEXT NOT NULL
);
CREATE INDEX evidence_case_idx ON evidence(case_id);

-- audit_log é append-only: revogar UPDATE/DELETE ao role da API.
CREATE TABLE audit_log (
    id        UUID PRIMARY KEY,
    at        TIMESTAMPTZ NOT NULL,
    actor     TEXT NOT NULL,
    action    TEXT NOT NULL,
    subject   TEXT NOT NULL,
    meta      JSONB
);
CREATE INDEX audit_log_actor_idx ON audit_log(actor);
CREATE INDEX audit_log_subject_idx ON audit_log(subject);

-- +goose Down
DROP TABLE audit_log;
DROP TABLE evidence;
DROP TABLE target_snapshots;
DROP TABLE recon_jobs;
DROP TABLE authorized_targets;
DROP TABLE users;
