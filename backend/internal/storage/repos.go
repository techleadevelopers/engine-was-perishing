package storage

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/nexus-ip/recon-lab/pkg/models"
)

// --- Recon jobs ---------------------------------------------------------

func (p *Postgres) CreateJob(ctx context.Context, j *models.ReconJob) error {
	if j.ID == "" {
		j.ID = uuid.NewString()
	}
	j.CreatedAt = time.Now().UTC()
	j.Status = "queued"
	_, err := p.Pool.Exec(ctx, `
		INSERT INTO recon_jobs (id, target_ip, mode, status, requested_by, case_id, created_at)
		VALUES ($1, $2, $3, $4, $5, NULLIF($6,''), $7)`,
		j.ID, j.TargetIP, j.Mode, j.Status, j.RequestedBy, j.CaseID, j.CreatedAt)
	return err
}

func (p *Postgres) GetJob(ctx context.Context, id string) (*models.ReconJob, error) {
	j := &models.ReconJob{}
	err := p.Pool.QueryRow(ctx, `
		SELECT id, target_ip, mode, status, requested_by, COALESCE(case_id,''), created_at, finished_at
		FROM recon_jobs WHERE id = $1`, id).
		Scan(&j.ID, &j.TargetIP, &j.Mode, &j.Status, &j.RequestedBy, &j.CaseID, &j.CreatedAt, &j.FinishedAt)
	if err != nil {
		return nil, err
	}
	return j, nil
}

// --- Target snapshots (JSONB) ------------------------------------------

func (p *Postgres) UpsertSnapshot(ctx context.Context, s *models.TargetSnapshot) error {
	s.FetchedAt = time.Now().UTC()
	blob, _ := json.Marshal(s)
	_, err := p.Pool.Exec(ctx, `
		INSERT INTO target_snapshots (ip, data, fetched_at)
		VALUES ($1, $2, $3)
		ON CONFLICT (ip) DO UPDATE SET data = EXCLUDED.data, fetched_at = EXCLUDED.fetched_at`,
		s.IP, blob, s.FetchedAt)
	return err
}

func (p *Postgres) GetSnapshot(ctx context.Context, ip string) (*models.TargetSnapshot, error) {
	var blob []byte
	err := p.Pool.QueryRow(ctx,
		`SELECT data FROM target_snapshots WHERE ip = $1`, ip).Scan(&blob)
	if err != nil {
		return nil, err
	}
	s := &models.TargetSnapshot{}
	if err := json.Unmarshal(blob, s); err != nil {
		return nil, err
	}
	return s, nil
}

// --- Evidence -----------------------------------------------------------

func (p *Postgres) InsertEvidence(ctx context.Context, e *models.Evidence) error {
	if e.ID == "" {
		e.ID = uuid.NewString()
	}
	e.CreatedAt = time.Now().UTC()
	_, err := p.Pool.Exec(ctx, `
		INSERT INTO evidence (id, case_id, kind, sha256, s3_key, tsa_token, created_at, created_by)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		e.ID, e.CaseID, e.Kind, e.SHA256, e.S3Key, e.TSAToken, e.CreatedAt, e.CreatedBy)
	return err
}

// --- Audit log ---------------------------------------------------------

func (p *Postgres) Audit(ctx context.Context, actor, action, subject string, meta any) {
	blob, _ := json.Marshal(meta)
	_, _ = p.Pool.Exec(ctx, `
		INSERT INTO audit_log (id, at, actor, action, subject, meta)
		VALUES ($1, now(), $2, $3, $4, $5)`,
		uuid.NewString(), actor, action, subject, blob)
}
