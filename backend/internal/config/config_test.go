package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLoad_Defaults(t *testing.T) {
	t.Setenv("DDXY_ADDR", "")
	t.Setenv("DDXY_DATA_DIR", "")
	t.Setenv("DDXY_LOG_LEVEL", "")
	t.Setenv("DDXY_ADMIN_TOKEN", "")

	cfg := Load()

	assert.Equal(t, ":8080", cfg.Addr)
	assert.Equal(t, "./data", cfg.DataDir)
	assert.Equal(t, "info", cfg.LogLevel)
	assert.Equal(t, "", cfg.AdminToken)
}

func TestLoad_FromEnv(t *testing.T) {
	t.Setenv("DDXY_ADDR", ":9090")
	t.Setenv("DDXY_DATA_DIR", "/tmp/test-data")
	t.Setenv("DDXY_LOG_LEVEL", "debug")
	t.Setenv("DDXY_ADMIN_TOKEN", "s3cret")

	cfg := Load()

	assert.Equal(t, ":9090", cfg.Addr)
	assert.Equal(t, "/tmp/test-data", cfg.DataDir)
	assert.Equal(t, "debug", cfg.LogLevel)
	assert.Equal(t, "s3cret", cfg.AdminToken)
}
