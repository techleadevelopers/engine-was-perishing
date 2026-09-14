// Package recon orquestra jobs de reconhecimento consumidos do broker.
package recon

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"time"

	"github.com/rs/zerolog/log"
	"golang.org/x/sync/semaphore"

	"github.com/nexus-ip/recon-lab/internal/bgp"
	"github.com/nexus-ip/recon-lab/internal/broker"
	"github.com/nexus-ip/recon-lab/internal/risk"
	"github.com/nexus-ip/recon-lab/internal/sigint"
	"github.com/nexus-ip/recon-lab/internal/storage"
	"github.com/nexus-ip/recon-lab/pkg/models"
)

type Deps struct {
	DB         *storage.Postgres
	Bus        *broker.Bus
	BGP        *bgp.Client
	SIGINT     *sigint.Classifier
	Risk       *risk.Scorer
	AllowList  []string
	MaxWorkers int
}

type Engine struct {
	Deps
	sem *semaphore.Weighted
}

func NewEngine(d Deps) *Engine {
	if d.MaxWorkers <= 0 {
		d.MaxWorkers = 8
	}
	return &Engine{Deps: d, sem: semaphore.NewWeighted(int64(d.MaxWorkers))}
}

func (e *Engine) Run(ctx context.Context) error {
	_, err := e.Bus.Subscribe(broker.SubjectReconJobs, func(data []byte) {
		var job models.ReconJob
		if err := json.Unmarshal(data, &job); err != nil {
			log.Warn().Err(err).Msg("bad job payload")
			return
		}
		if !e.authorized(job.TargetIP) {
			log.Warn().Str("ip", job.TargetIP).Msg("target not authorized")
			return
		}
		if err := e.sem.Acquire(ctx, 1); err != nil {
			return
		}
		go func() {
			defer e.sem.Release(1)
			if err := e.execute(ctx, &job); err != nil {
				log.Error().Err(err).Str("job", job.ID).Msg("recon failed")
			}
		}()
	})
	if err != nil {
		return err
	}
	<-ctx.Done()
	return nil
}

func (e *Engine) authorized(ip string) bool {
	if len(e.AllowList) == 0 {
		return false
	}
	target := net.ParseIP(ip)
	if target == nil {
		return false
	}
	for _, entry := range e.AllowList {
		if _, cidr, err := net.ParseCIDR(entry); err == nil && cidr.Contains(target) {
			return true
		}
		if entry == ip {
			return true
		}
	}
	return false
}

func (e *Engine) execute(ctx context.Context, job *models.ReconJob) error {
	log.Info().Str("job", job.ID).Str("ip", job.TargetIP).Msg("recon start")

	snap := &models.TargetSnapshot{IP: job.TargetIP, FetchedAt: time.Now().UTC()}

	// 1. BGP / ASN / RDAP / WHOIS
	asn, err := e.BGP.LookupASN(ctx, job.TargetIP)
	if err != nil {
		log.Warn().Err(err).Msg("bgp lookup")
	} else {
		snap.ASN, snap.ASName, snap.CIDR = asn.Number, asn.Name, asn.CIDR
		snap.Country, snap.Region, snap.City = asn.Country, asn.Region, asn.City
		snap.BGPPath = asn.Path
	}

	// 2. Active TCP/TLS scan
	scanner := NewTCPScanner()
	ports, certs, err := scanner.Scan(ctx, job.TargetIP)
	if err != nil {
		log.Warn().Err(err).Msg("tcp scan")
	}
	snap.Ports, snap.TLSCerts = ports, certs

	// 3. SIGINT (heurísticas passivas — em produção alimentado por sensores)
	events := e.SIGINT.Analyze(job.TargetIP)
	for _, ev := range events {
		_ = e.Bus.Publish(broker.SubjectSIGINTEvents, ev)
	}

	// 4. Risk score
	snap.Risk = e.Risk.Score(snap, events)

	// 5. Persistência + telemetria
	if err := e.DB.UpsertSnapshot(ctx, snap); err != nil {
		return fmt.Errorf("upsert snapshot: %w", err)
	}
	_ = e.Bus.Publish(broker.SubjectRiskUpdates, snap.Risk)
	_ = e.Bus.Publish(broker.SubjectProbeEvents, snap)

	e.DB.Audit(ctx, job.RequestedBy, "recon.completed", job.TargetIP, map[string]any{
		"job_id": job.ID, "ports": len(snap.Ports), "risk": snap.Risk.Score,
	})
	log.Info().Str("job", job.ID).Int("risk", snap.Risk.Score).Msg("recon done")
	return nil
}
