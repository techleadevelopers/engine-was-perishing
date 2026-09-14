// Package ws implementa gateway WebSocket que distribui eventos NATS
// (probe, sigint, risk) para clientes autenticados.
package ws

import (
	"context"
	"net/http"
	"sync"

	"nhooyr.io/websocket"
	"nhooyr.io/websocket/wsjson"

	"github.com/nexus-ip/recon-lab/internal/broker"
)

type Hub struct {
	bus     *broker.Bus
	mu      sync.RWMutex
	clients map[*client]struct{}
}

type client struct {
	conn *websocket.Conn
	send chan any
}

func NewHub(bus *broker.Bus) *Hub {
	return &Hub{bus: bus, clients: map[*client]struct{}{}}
}

func (h *Hub) Run(ctx context.Context) {
	subs := []string{broker.SubjectProbeEvents, broker.SubjectSIGINTEvents, broker.SubjectRiskUpdates}
	for _, s := range subs {
		subject := s
		_, _ = h.bus.Subscribe(subject, func(data []byte) {
			h.broadcast(map[string]any{"subject": subject, "data": rawJSON(data)})
		})
	}
	<-ctx.Done()
}

func (h *Hub) HandleWS(w http.ResponseWriter, r *http.Request) {
	c, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: []string{"*"},
	})
	if err != nil {
		return
	}
	cli := &client{conn: c, send: make(chan any, 32)}
	h.mu.Lock()
	h.clients[cli] = struct{}{}
	h.mu.Unlock()

	ctx := r.Context()
	go func() {
		for msg := range cli.send {
			if err := wsjson.Write(ctx, c, msg); err != nil {
				return
			}
		}
	}()

	for {
		if _, _, err := c.Read(ctx); err != nil {
			break
		}
	}

	h.mu.Lock()
	delete(h.clients, cli)
	h.mu.Unlock()
	close(cli.send)
	_ = c.Close(websocket.StatusNormalClosure, "bye")
}

func (h *Hub) broadcast(msg any) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for c := range h.clients {
		select {
		case c.send <- msg:
		default:
		}
	}
}

type rawJSON []byte

func (r rawJSON) MarshalJSON() ([]byte, error) { return r, nil }
