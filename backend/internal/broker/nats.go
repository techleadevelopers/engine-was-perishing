package broker

import (
	"encoding/json"

	"github.com/nats-io/nats.go"
)

const (
	SubjectReconJobs    = "recon.jobs"
	SubjectProbeEvents  = "recon.probe"
	SubjectSIGINTEvents = "recon.sigint"
	SubjectRiskUpdates  = "recon.risk"
)

type Bus struct {
	nc *nats.Conn
}

func NewNATS(url string) (*Bus, error) {
	nc, err := nats.Connect(url,
		nats.MaxReconnects(-1),
		nats.ReconnectWait(nats.DefaultReconnectWait),
	)
	if err != nil {
		return nil, err
	}
	return &Bus{nc: nc}, nil
}

func (b *Bus) Close() { b.nc.Drain() }

func (b *Bus) Publish(subject string, v any) error {
	data, err := json.Marshal(v)
	if err != nil {
		return err
	}
	return b.nc.Publish(subject, data)
}

func (b *Bus) Subscribe(subject string, fn func([]byte)) (*nats.Subscription, error) {
	return b.nc.Subscribe(subject, func(m *nats.Msg) { fn(m.Data) })
}
