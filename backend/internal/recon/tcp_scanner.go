package recon

import (
	"context"
	"crypto/sha256"
	"crypto/tls"
	"encoding/hex"
	"fmt"
	"io"
	"net"
	"regexp"
	"time"

	"github.com/nexus-ip/recon-lab/pkg/models"
)

// TCPScanner faz handshake TCP direto e coleta banners + certificados TLS.
// Nunca executa exploits, apenas leitura.
type TCPScanner struct {
	Ports   []int
	Timeout time.Duration
}

func NewTCPScanner() *TCPScanner {
	return &TCPScanner{
		Ports:   []int{22, 25, 53, 80, 110, 143, 443, 465, 587, 993, 995, 1723, 3128, 3306, 3389, 5060, 8080, 8291, 8443, 8728},
		Timeout: 4 * time.Second,
	}
}

var emailRe = regexp.MustCompile(`[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`)

func (s *TCPScanner) Scan(ctx context.Context, ip string) ([]models.PortInfo, []models.TLSCert, error) {
	ports := make([]models.PortInfo, 0, len(s.Ports))
	certs := make([]models.TLSCert, 0)

	dialer := &net.Dialer{Timeout: s.Timeout}

	for _, p := range s.Ports {
		select {
		case <-ctx.Done():
			return ports, certs, ctx.Err()
		default:
		}

		addr := fmt.Sprintf("%s:%d", ip, p)
		conn, err := dialer.DialContext(ctx, "tcp", addr)
		if err != nil {
			continue
		}

		info := models.PortInfo{Port: p, Proto: "tcp", Observed: time.Now().UTC()}

		// TLS handshake para portas típicas
		if p == 443 || p == 8443 || p == 465 || p == 993 || p == 995 {
			tconn := tls.Client(conn, &tls.Config{InsecureSkipVerify: true, ServerName: ip})
			_ = tconn.SetDeadline(time.Now().Add(s.Timeout))
			if err := tconn.Handshake(); err == nil {
				for _, cert := range tconn.ConnectionState().PeerCertificates {
					sum := sha256.Sum256(cert.Raw)
					c := models.TLSCert{
						Port: p, Subject: cert.Subject.String(), Issuer: cert.Issuer.String(),
						SANs: cert.DNSNames, NotBefore: cert.NotBefore, NotAfter: cert.NotAfter,
						SHA256:     hex.EncodeToString(sum[:]),
						SelfSigned: cert.Subject.String() == cert.Issuer.String(),
					}
					c.LeakedIDs = append(c.LeakedIDs, emailRe.FindAllString(cert.Subject.String(), -1)...)
					for _, san := range cert.DNSNames {
						c.LeakedIDs = append(c.LeakedIDs, emailRe.FindAllString(san, -1)...)
					}
					certs = append(certs, c)
				}
				info.Service = "tls"
			}
			_ = tconn.Close()
		} else {
			// Banner grabbing passivo (leitura curta)
			_ = conn.SetReadDeadline(time.Now().Add(1500 * time.Millisecond))
			buf := make([]byte, 512)
			n, _ := io.ReadFull(conn, buf)
			if n > 0 {
				info.Banner = string(buf[:n])
			}
			_ = conn.Close()
		}

		ports = append(ports, info)
	}
	return ports, certs, nil
}
