package config

import "os"

type Config struct {
	Addr       string
	LogLevel   string
	AdminToken string
}

func Load() Config {
	return Config{
		Addr:       envOr("DDXY_ADDR", ":8080"),
		LogLevel:   envOr("DDXY_LOG_LEVEL", "info"),
		AdminToken: os.Getenv("DDXY_ADMIN_TOKEN"),
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
