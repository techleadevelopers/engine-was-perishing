package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/nexus-ip/recon-lab/internal/auth"
	"github.com/nexus-ip/recon-lab/internal/broker"
	"github.com/nexus-ip/recon-lab/internal/storage"
	"github.com/nexus-ip/recon-lab/pkg/models"
)

type ReconHandler struct {
	db  *storage.Postgres
	bus *broker.Bus
}

func NewReconHandler(db *storage.Postgres, bus *broker.Bus) *ReconHandler {
	return &ReconHandler{db: db, bus: bus}
}

func (h *ReconHandler) CreateJob(w http.ResponseWriter, r *http.Request) {
	user, err := auth.FromContext(r.Context())
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	if !user.MFA {
		http.Error(w, "mfa required", http.StatusForbidden)
		return
	}

	var body struct {
		TargetIP string `json:"target_ip"`
		Mode     string `json:"mode"`
		CaseID   string `json:"case_id,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if body.TargetIP == "" {
		http.Error(w, "target_ip required", http.StatusBadRequest)
		return
	}

	job := &models.ReconJob{
		TargetIP: body.TargetIP, Mode: body.Mode, CaseID: body.CaseID,
		RequestedBy: user.Sub,
	}
	if err := h.db.CreateJob(r.Context(), job); err != nil {
		http.Error(w, "db", http.StatusInternalServerError)
		return
	}
	if err := h.bus.Publish(broker.SubjectReconJobs, job); err != nil {
		http.Error(w, "broker", http.StatusInternalServerError)
		return
	}
	h.db.Audit(r.Context(), user.Sub, "recon.requested", body.TargetIP, job)
	writeJSON(w, job)
}

func (h *ReconHandler) GetJob(w http.ResponseWriter, r *http.Request) {
	j, err := h.db.GetJob(r.Context(), chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	writeJSON(w, j)
}

func (h *ReconHandler) GetSnapshot(w http.ResponseWriter, r *http.Request) {
	s, err := h.db.GetSnapshot(r.Context(), chi.URLParam(r, "ip"))
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	writeJSON(w, s)
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}
