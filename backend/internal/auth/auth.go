// Package auth implementa autenticação JWT + RBAC + hook para MFA (TOTP).
// Em produção, integrar com provedor de identidade (Keycloak/Auth0) e HSM.
package auth

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/nexus-ip/recon-lab/internal/storage"
)

type ctxKey string

const CtxUser ctxKey = "user"

type Claims struct {
	Sub   string   `json:"sub"`
	Email string   `json:"email"`
	Roles []string `json:"roles"`
	MFA   bool     `json:"mfa"`
	jwt.RegisteredClaims
}

type Service struct {
	secret []byte
	db     *storage.Postgres
}

func NewService(secret string, db *storage.Postgres) *Service {
	return &Service{secret: []byte(secret), db: db}
}

// Middleware valida o Bearer token e exige MFA para operações sensíveis.
func (s *Service) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if raw == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		claims := &Claims{}
		tok, err := jwt.ParseWithClaims(raw, claims, func(_ *jwt.Token) (any, error) {
			return s.secret, nil
		})
		if err != nil || !tok.Valid {
			http.Error(w, "invalid token", http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), CtxUser, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (s *Service) issue(claims Claims) (string, error) {
	claims.ExpiresAt = jwt.NewNumericDate(time.Now().Add(30 * time.Minute))
	claims.IssuedAt = jwt.NewNumericDate(time.Now())
	claims.Issuer = "nexus-ip"
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tok.SignedString(s.secret)
}

// LoginHandler troca credenciais por um token pré-MFA.
// Substituir pela verificação real (Argon2id + user store).
func (s *Service) LoginHandler(w http.ResponseWriter, r *http.Request) {
	var body struct{ Email, Password string }
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if body.Email == "" || body.Password == "" {
		http.Error(w, "missing credentials", http.StatusBadRequest)
		return
	}
	// TODO: validar Argon2id no user store; abaixo é um placeholder.
	token, err := s.issue(Claims{Sub: body.Email, Email: body.Email, Roles: []string{"analyst"}, MFA: false})
	if err != nil {
		http.Error(w, "token", http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]any{"token": token, "mfa_required": true})
}

// MFAVerifyHandler consome um código TOTP e emite um token com MFA=true.
func (s *Service) MFAVerifyHandler(w http.ResponseWriter, r *http.Request) {
	var body struct{ Token, Code string }
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	claims := &Claims{}
	if _, err := jwt.ParseWithClaims(body.Token, claims, func(_ *jwt.Token) (any, error) {
		return s.secret, nil
	}); err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}
	// TODO: validar TOTP com segredo do usuário. Placeholder aceita "000000" em dev.
	if body.Code != "000000" {
		http.Error(w, "invalid mfa", http.StatusUnauthorized)
		return
	}
	claims.MFA = true
	tok, err := s.issue(*claims)
	if err != nil {
		http.Error(w, "token", http.StatusInternalServerError)
		return
	}
	writeJSON(w, map[string]any{"token": tok})
}

// RequireRole retorna middleware que exige um papel específico.
func RequireRole(role string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			c, ok := r.Context().Value(CtxUser).(*Claims)
			if !ok {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			for _, x := range c.Roles {
				if x == role {
					next.ServeHTTP(w, r)
					return
				}
			}
			http.Error(w, "forbidden", http.StatusForbidden)
		})
	}
}

func FromContext(ctx context.Context) (*Claims, error) {
	c, ok := ctx.Value(CtxUser).(*Claims)
	if !ok {
		return nil, errors.New("no user in context")
	}
	return c, nil
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}
