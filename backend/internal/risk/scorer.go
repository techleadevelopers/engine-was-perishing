// Package risk computa um score 0-100 para o alvo.
package risk

import (
	"time"

	"github.com/nexus-ip/recon-lab/pkg/models"
)

type Scorer struct{}

func NewScorer() *Scorer { return &Scorer{} }

func (s *Scorer) Score(snap *models.TargetSnapshot, events []models.SIGINTEvent) models.RiskScore {
	score := 15
	signals := []string{}

	if len(snap.Ports) > 5 {
		score += 15
		signals = append(signals, "exposed-surface")
	}
	for _, p := range snap.Ports {
		if p.Port == 8291 { // MikroTik Winbox
			score += 20
			signals = append(signals, "mikrotik-winbox")
		}
		if len(p.CVEs) > 0 {
			score += 10
			signals = append(signals, "known-cve")
		}
	}
	for _, cert := range snap.TLSCerts {
		if cert.SelfSigned {
			score += 8
			signals = append(signals, "self-signed-cert")
		}
		if len(cert.LeakedIDs) > 0 {
			score += 6
			signals = append(signals, "cert-identity-leak")
		}
	}
	for _, ev := range events {
		if ev.Kind == "c2" && ev.Confidence > 0.9 {
			score += 25
			signals = append(signals, "c2-beaconing")
		}
	}
	if score > 100 {
		score = 100
	}

	tier := "low"
	switch {
	case score >= 85:
		tier = "critical"
	case score >= 65:
		tier = "high"
	case score >= 40:
		tier = "medium"
	}

	return models.RiskScore{
		Score: score, Tier: tier, Signals: signals,
		ComputedAt: time.Now().UTC(),
	}
}
