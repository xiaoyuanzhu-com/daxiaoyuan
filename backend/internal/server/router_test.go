package server

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/config"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/db"
)

func newTestRouter(t *testing.T, token string) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	d, err := db.Open(":memory:")
	require.NoError(t, err)
	t.Cleanup(func() { d.Close() })
	return NewRouter(d, config.Config{AdminToken: token})
}

func TestRouter_Healthz(t *testing.T) {
	r := newTestRouter(t, "")
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, 200, w.Code)
	assert.Equal(t, "ok", w.Body.String())
}

func TestRouter_AllAPIRoutesRegistered(t *testing.T) {
	r := newTestRouter(t, "")
	routes := r.Routes()

	wantPaths := map[string]bool{
		"GET /api/v1/cities":      false,
		"GET /api/v1/schools":     false,
		"GET /api/v1/schools/:id": false,
		"GET /api/v1/dump.json":   false,
		"POST /api/v1/schools":    false,
		"PUT /api/v1/schools/:id": false,
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
	r := newTestRouter(t, "")
	req := httptest.NewRequest(http.MethodGet, "/api/v1/cities", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, "*", w.Header().Get("Access-Control-Allow-Origin"))
	assert.Contains(t, w.Header().Get("Access-Control-Allow-Headers"), "Authorization")
}

// Write endpoints are gated by Bearer auth. The table below covers the four
// states callers can be in (no token configured, missing header, wrong token,
// correct token) so we never silently regress to "anyone can write".
func TestRouter_WriteAuth(t *testing.T) {
	cases := []struct {
		name       string
		configured string
		header     string
		wantStatus int
	}{
		{"no token configured", "", "Bearer anything", http.StatusUnauthorized},
		{"missing auth header", "s3cret", "", http.StatusUnauthorized},
		{"non-bearer scheme", "s3cret", "Basic dXNlcjpwYXNz", http.StatusUnauthorized},
		{"wrong token", "s3cret", "Bearer nope", http.StatusUnauthorized},
		// Correct token reaches the handler; the body is intentionally
		// invalid so we get 400 (not 200) — what matters is the request
		// passed auth and hit validation.
		{"correct token", "s3cret", "Bearer s3cret", http.StatusBadRequest},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			r := newTestRouter(t, tc.configured)
			req := httptest.NewRequest(http.MethodPost, "/api/v1/schools", strings.NewReader("{}"))
			req.Header.Set("Content-Type", "application/json")
			if tc.header != "" {
				req.Header.Set("Authorization", tc.header)
			}
			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)
			assert.Equal(t, tc.wantStatus, w.Code)
		})
	}
}

func TestRouter_GETUnaffectedByAuth(t *testing.T) {
	r := newTestRouter(t, "")
	for _, path := range []string{"/api/v1/cities", "/api/v1/schools", "/api/v1/dump.json"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code, "GET %s should not require auth", path)
	}
}
