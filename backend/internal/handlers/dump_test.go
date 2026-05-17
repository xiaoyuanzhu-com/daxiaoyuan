package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/models"
)

func TestGETDump_Shape(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repoS := newTestRepo(t,
		&models.School{ID: "pku", CityID: "bj", Name: "北京大学", Status: "appt", LastUpdate: mustTime("2026-05-09T00:00:00Z")},
	)

	r := gin.New()
	r.GET("/api/v1/dump.json", Dump(repoS))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/dump.json", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var body map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))

	assert.NotEmpty(t, body["generatedAt"])
	cities := body["cities"].([]any)
	assert.Len(t, cities, 8)
	schools := body["schools"].([]any)
	require.Len(t, schools, 1)
	pku := schools[0].(map[string]any)
	assert.Equal(t, "pku", pku["id"])
	assert.Contains(t, pku, "facilities") // full detail shape
}
