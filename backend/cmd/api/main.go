// cmd/api — HTTP API + WebSocket gateway para o NEXUS-IP Recon Lab.
package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/nexus-ip/recon-lab/internal/api"
	"github.com/nexus-ip/recon-lab/internal/auth"
	"github.com/nexus-ip/recon-lab/internal/broker"
	"github.com/nexus-ip/recon-lab/internal/config"
	"github.com/nexus-ip/recon-lab/internal/storage"
	"github.com/nexus-ip/recon-lab/internal/ws"
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

	hub := ws.NewHub(bus)
	go hub.Run(ctx)

	authSvc := auth.NewService(cfg.JWTSecret, db)
	reconAPI := api.NewReconHandler(db, bus)
	dossierAPI := api.NewDossierHandler(db)

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health
	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("ok"))
	})

	// Auth
	r.Post("/auth/login", authSvc.LoginHandler)
	r.Post("/auth/mfa/verify", authSvc.MFAVerifyHandler)

	// Protected API
	r.Group(func(r chi.Router) {
		r.Use(authSvc.Middleware)

		r.Route("/api/v1", func(r chi.Router) {
			r.Post("/recon/jobs", reconAPI.CreateJob)
			r.Get("/recon/jobs/{id}", reconAPI.GetJob)
			r.Get("/targets/{ip}/snapshot", reconAPI.GetSnapshot)

			r.Post("/dossier/{targetId}/generate", dossierAPI.Generate)
			r.Get("/dossier/{id}/pdf", dossierAPI.DownloadPDF)
			r.Post("/dossier/{id}/preservation-order", dossierAPI.PreservationOrder)
		})

		// WebSocket em tempo real
		r.Get("/ws/telemetry", hub.HandleWS)
	})

	srv := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Info().Str("addr", cfg.HTTPAddr).Msg("api listening")
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal().Err(err).Msg("http")
		}
	}()

	<-ctx.Done()
	shutdown, cancelSD := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelSD()
	_ = srv.Shutdown(shutdown)
	os.Exit(0)
}
