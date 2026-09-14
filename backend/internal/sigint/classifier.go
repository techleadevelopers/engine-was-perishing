// Package sigint classifica padrões de tráfego (heurística de tamanho +
// inter-arrival). Em produção lê PCAP/NetFlow via sensores dedicados.
package sigint

import (
	"time"

	"github.com/nexus-ip/recon-lab/pkg/models"
)

type Classifier struct{}

func NewClassifier() *Classifier { return &Classifier{} }

// Analyze retorna eventos SIGINT correlacionados com o IP alvo.
// Placeholder: substitua por leitura real de flows/PCAPs vindas do broker.
func (c *Classifier) Analyze(ip string) []models.SIGINTEvent {
	now := time.Now().UTC()
	return []models.SIGINTEvent{
		{TargetIP: ip, Kind: "c2", Confidence: 0.942, Description: "60s heartbeats, jitter <3%%", At: now},
		{TargetIP: ip, Kind: "voip", Confidence: 0.71, Description: "UDP burst 20/40 ms cadence", At: now},
		{TargetIP: ip, Kind: "vpn", Confidence: 0.63, Description: "WireGuard-like handshake padding", At: now},
	}
}
