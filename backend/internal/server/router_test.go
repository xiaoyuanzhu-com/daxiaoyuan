package server

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/db"
)

func TestRouter_Healthz(t *testing.T) {
	gin.SetMode(gin.TestMode)
	d, err := db.Open(":memory:")
	require.NoError(t, err)
	defer d.Close()

	r := NewRouter(d)
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, 200, w.Code)
	assert.Equal(t, "ok", w.Body.String())
}

func TestRouter_AllAPIRoutesRegistered(t *testing.T) {
	gin.SetMode(gin.TestMode)
	d, err := db.Open(":memory:")
	require.NoError(t, err)
	defer d.Close()

	r := NewRouter(d)
	routes := r.Routes()

	wantPaths := map[string]bool{
		"GET /api/v1/cities":      false,
		"GET /api/v1/schools":     false,
		"GET /api/v1/schools/:id": false,
		"GET /api/v1/dump.json":   false,
	}
	for _, ri := range routes {
		key := ri.Method + " " + ri.Path
		if _, ok := wantPaths[key]; ok {
			wantPaths[key] = true
		}
	}
	for path, found := range wantPaths {
		assert.True(t, found, "expected route %s to be registered", path)
	}
}

func TestRouter_CORSHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)
	d, err := db.Open(":memory:")
	require.NoError(t, err)
	defer d.Close()

	r := NewRouter(d)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/cities", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, "*", w.Header().Get("Access-Control-Allow-Origin"))
}
