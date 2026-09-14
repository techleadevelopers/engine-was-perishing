package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/nexus-ip/recon-lab/internal/auth"
	"github.com/nexus-ip/recon-lab/internal/dossier"
	"github.com/nexus-ip/recon-lab/internal/storage"
)

type DossierHandler struct {
	db  *storage.Postgres
	gen *dossier.Generator
}

func NewDossierHandler(db *storage.Postgres) *DossierHandler {
	return &DossierHandler{db: db, gen: dossier.NewGenerator(db)}
}

func (h *DossierHandler) Generate(w http.ResponseWriter, r *http.Request) {
	user, err := auth.FromContext(r.Context())
	if err != nil || !user.MFA {
		http.Error(w, "mfa required", http.StatusForbidden)
		return
	}
	ip := chi.URLParam(r, "targetId")
	ev, err := h.gen.Build(r.Context(), ip, user.Sub)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	h.db.Audit(r.Context(), user.Sub, "dossier.generated", ip, ev)
	writeJSON(w, ev)
}

func (h *DossierHandler) DownloadPDF(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	pdf, err := h.gen.LoadPDF(r.Context(), id)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", `attachment; filename="dossier.pdf"`)
	_, _ = w.Write(pdf)
}

func (h *DossierHandler) PreservationOrder(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	txt, err := h.gen.PreservationOrder(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = w.Write([]byte(txt))
}
