package config

import "github.com/caarlos0/env/v10"

type Config struct {
	HTTPAddr           string   `env:"HTTP_ADDR"             envDefault:":8080"`
	PostgresDSN        string   `env:"POSTGRES_DSN,required"`
	NATSURL            string   `env:"NATS_URL"              envDefault:"nats://localhost:4222"`
	RedisURL           string   `env:"REDIS_URL"             envDefault:"redis://localhost:6379/0"`
	S3Endpoint         string   `env:"S3_ENDPOINT"           envDefault:"http://localhost:9000"`
	S3Bucket           string   `env:"S3_BUCKET"             envDefault:"nexus-evidence"`
	S3AccessKey        string   `env:"S3_ACCESS_KEY,required"`
	S3SecretKey        string   `env:"S3_SECRET_KEY,required"`
	JWTSecret          string   `env:"JWT_SECRET,required"`
	CORSAllowedOrigins []string `env:"CORS_ORIGINS"          envSeparator:"," envDefault:"http://localhost:8080"`
	AuthorizedTargets  []string `env:"AUTHORIZED_TARGETS"    envSeparator:","`
	IngestorWorkers    int      `env:"INGESTOR_WORKERS"      envDefault:"16"`
	TSAURL             string   `env:"RFC3161_TSA_URL"       envDefault:"https://freetsa.org/tsr"`
}

func Load() (*Config, error) {
	c := &Config{}
	if err := env.Parse(c); err != nil {
		return nil, err
	}
	return c, nil
}
