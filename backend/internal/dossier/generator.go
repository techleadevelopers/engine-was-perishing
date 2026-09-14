// Package dossier gera o dossiê forense em PDF, calcula SHA-256 do
// artefato e (em produção) obtém carimbo de tempo RFC 3161 antes de
// persistir a evidência com trilha de auditoria.
package dossier

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jung-kurt/gofpdf"

	"github.com/nexus-ip/recon-lab/internal/storage"
	"github.com/nexus-ip/recon-lab/pkg/models"
)

type Generator struct {
	db      *storage.Postgres
	storage map[string][]byte // TODO: substituir por S3/MinIO
}

func NewGenerator(db *storage.Postgres) *Generator {
	return &Generator{db: db, storage: map[string][]byte{}}
}

func (g *Generator) Build(ctx context.Context, ip, actor string) (*models.Evidence, error) {
	snap, err := g.db.GetSnapshot(ctx, ip)
	if err != nil {
		return nil, err
	}

	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetTitle("NEXUS-IP :: Dossie Forense", true)
	pdf.AddPage()
	pdf.SetFont("Courier", "B", 14)
	pdf.Cell(0, 8, "NEXUS-IP :: DOSSIE FORENSE")
	pdf.Ln(10)
	pdf.SetFont("Courier", "", 9)
	pdf.Cell(0, 5, fmt.Sprintf("Gerado em (UTC): %s", time.Now().UTC().Format(time.RFC3339)))
	pdf.Ln(6)
	pdf.Cell(0, 5, fmt.Sprintf("Analista: %s", actor))
	pdf.Ln(6)
	pdf.Cell(0, 5, fmt.Sprintf("Alvo: %s  ASN: AS%d  ISP: %s", snap.IP, snap.ASN, snap.ASName))
	pdf.Ln(6)
	pdf.Cell(0, 5, fmt.Sprintf("Local: %s / %s / %s", snap.City, snap.Region, snap.Country))
	pdf.Ln(6)
	pdf.Cell(0, 5, fmt.Sprintf("Risco: %d (%s)", snap.Risk.Score, snap.Risk.Tier))
	pdf.Ln(8)
	pdf.SetFont("Courier", "B", 10)
	pdf.Cell(0, 6, "Portas expostas")
	pdf.Ln(6)
	pdf.SetFont("Courier", "", 9)
	for _, p := range snap.Ports {
		line := fmt.Sprintf("  %-5d  %-6s  %s", p.Port, p.Proto, truncate(p.Banner, 80))
		pdf.MultiCell(0, 4, line, "", "L", false)
	}

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	sum := sha256.Sum256(buf.Bytes())
	hash := hex.EncodeToString(sum[:])
	id := uuid.NewString()
	key := fmt.Sprintf("dossier/%s.pdf", id)
	g.storage[id] = buf.Bytes()

	ev := &models.Evidence{
		ID: id, CaseID: ip, Kind: "dossier-pdf",
		SHA256: hash, S3Key: key, CreatedBy: actor,
	}
	if err := g.db.InsertEvidence(ctx, ev); err != nil {
		return nil, err
	}
	// TODO: solicitar timestamp RFC 3161 e persistir ev.TSAToken.
	return ev, nil
}

func (g *Generator) LoadPDF(_ context.Context, id string) ([]byte, error) {
	data, ok := g.storage[id]
	if !ok {
		return nil, fmt.Errorf("not found")
	}
	return data, nil
}

func (g *Generator) PreservationOrder(ctx context.Context, id string) (string, error) {
	// Minuta de ofício conforme Marco Civil Art. 13/15 (retenção de logs).
	return fmt.Sprintf(`OFICIO DE PRESERVACAO DE DADOS - MARCO CIVIL DA INTERNET
Referencia interna: %s
Fundamento: Lei 12.965/2014, art. 10 e 15.
Solicita-se a preservacao pelo prazo minimo legal dos registros de conexao
e de aplicacoes associados ao IP investigado, sob pena de responsabilizacao.
`, id), nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
