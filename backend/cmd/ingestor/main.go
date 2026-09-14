// cmd/ingestor — worker que consome jobs de recon do NATS e executa
// varredura TCP/TLS + coleta de BGP/RDAP/WHOIS + heurísticas SIGINT.
package main

import (
	"context"
	"os/signal"
	"syscall"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/nexus-ip/recon-lab/internal/bgp"
	"github.com/nexus-ip/recon-lab/internal/broker"
	"github.com/nexus-ip/recon-lab/internal/config"
	"github.com/nexus-ip/recon-lab/internal/recon"
	"github.com/nexus-ip/recon-lab/internal/risk"
	"github.com/nexus-ip/recon-lab/internal/sigint"
	"github.com/nexus-ip/recon-lab/internal/storage"
)

func main() {
	zerolog.TimeFieldFormat = time.RFC3339Nano

	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("config")
	}

	ctx, cancel := signal.NotifyContext(context.Background(),
		syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	db, err := storage.NewPostgres(ctx, cfg.PostgresDSN)
	if err != nil {
		log.Fatal().Err(err).Msg("postgres")
	}
	defer db.Close()

	bus, err := broker.NewNATS(cfg.NATSURL)
	if err != nil {
		log.Fatal().Err(err).Msg("nats")
	}
	defer bus.Close()

	engine := recon.NewEngine(recon.Deps{
		DB:         db,
		Bus:        bus,
		BGP:        bgp.NewClient(),
		SIGINT:     sigint.NewClassifier(),
		Risk:       risk.NewScorer(),
		AllowList:  cfg.AuthorizedTargets,
		MaxWorkers: cfg.IngestorWorkers,
	})

	log.Info().Int("workers", cfg.IngestorWorkers).Msg("ingestor started")
	if err := engine.Run(ctx); err != nil {
		log.Fatal().Err(err).Msg("engine")
	}
}
