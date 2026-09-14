// Package models define os structs compartilhados entre API, ingestor e dossier.
package models

import "time"

type ReconJob struct {
	ID          string    `json:"id"`
	TargetIP    string    `json:"target_ip"`
	Mode        string    `json:"mode"` // passive | active | full
	Status      string    `json:"status"`
	RequestedBy string    `json:"requested_by"`
	CaseID      string    `json:"case_id,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	FinishedAt  *time.Time `json:"finished_at,omitempty"`
}

type TargetSnapshot struct {
	IP         string      `json:"ip"`
	ASN        int         `json:"asn"`
	ASName     string      `json:"as_name"`
	CIDR       string      `json:"cidr"`
	Country    string      `json:"country"`
	Region     string      `json:"region"`
	City       string      `json:"city"`
	Ports      []PortInfo  `json:"ports"`
	TLSCerts   []TLSCert   `json:"tls_certs"`
	BGPPath    []BGPHop    `json:"bgp_path"`
	Risk       RiskScore   `json:"risk"`
	FetchedAt  time.Time   `json:"fetched_at"`
}

type PortInfo struct {
	Port     int      `json:"port"`
	Proto    string   `json:"proto"`
	Service  string   `json:"service"`
	Banner   string   `json:"banner"`
	Product  string   `json:"product,omitempty"`
	Version  string   `json:"version,omitempty"`
	CVEs     []string `json:"cves,omitempty"`
	Observed time.Time `json:"observed"`
}

type TLSCert struct {
	Port       int       `json:"port"`
	Subject    string    `json:"subject"`
	Issuer     string    `json:"issuer"`
	SANs       []string  `json:"sans"`
	NotBefore  time.Time `json:"not_before"`
	NotAfter   time.Time `json:"not_after"`
	SHA256     string    `json:"sha256"`
	SelfSigned bool      `json:"self_signed"`
	LeakedIDs  []string  `json:"leaked_ids,omitempty"`
}

type BGPHop struct {
	ASN    int    `json:"asn"`
	Name   string `json:"name"`
	Role   string `json:"role"` // tier1 | ixp | edge | target
	Latency int   `json:"latency_ms,omitempty"`
}

type RiskScore struct {
	Score        int      `json:"score"` // 0-100
	Tier         string   `json:"tier"`  // low | medium | high | critical
	Signals      []string `json:"signals"`
	ComputedAt   time.Time `json:"computed_at"`
}

type SIGINTEvent struct {
	TargetIP    string    `json:"target_ip"`
	Kind        string    `json:"kind"` // c2 | voip | vpn | scan
	Confidence  float64   `json:"confidence"`
	Description string    `json:"description"`
	At          time.Time `json:"at"`
}

type Evidence struct {
	ID        string    `json:"id"`
	CaseID    string    `json:"case_id"`
	Kind      string    `json:"kind"`
	SHA256    string    `json:"sha256"`
	S3Key     string    `json:"s3_key"`
	TSAToken  []byte    `json:"tsa_token,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	CreatedBy string    `json:"created_by"`
}
