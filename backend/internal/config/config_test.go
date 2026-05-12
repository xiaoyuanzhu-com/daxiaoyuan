package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLoad_Defaults(t *testing.T) {
	t.Setenv("DDXY_ADDR", "")
	t.Setenv("DDXY_DB_PATH", "")
	t.Setenv("DDXY_LOG_LEVEL", "")

	cfg := Load()

	assert.Equal(t, ":8080", cfg.Addr)
	assert.Equal(t, "./ddxy.db", cfg.DBPath)
	assert.Equal(t, "info", cfg.LogLevel)
}

func TestLoad_FromEnv(t *testing.T) {
	t.Setenv("DDXY_ADDR", ":9090")
	t.Setenv("DDXY_DB_PATH", "/tmp/test.db")
	t.Setenv("DDXY_LOG_LEVEL", "debug")

	cfg := Load()

	assert.Equal(t, ":9090", cfg.Addr)
	assert.Equal(t, "/tmp/test.db", cfg.DBPath)
	assert.Equal(t, "debug", cfg.LogLevel)
}
