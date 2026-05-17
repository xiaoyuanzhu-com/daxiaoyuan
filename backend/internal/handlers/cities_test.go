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

func TestGETCities_EmptyDB(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repoS := newTestRepo(t)

	r := gin.New()
	r.GET("/api/v1/cities", Cities(repoS))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/cities", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var body struct {
		Cities []map[string]any `json:"cities"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Len(t, body.Cities, 8, "should return all 8 cities from cities.json")

	// bj is first and has zero schools when store is empty.
	bj := body.Cities[0]
	assert.Equal(t, "bj", bj["id"])
	assert.Equal(t, "北京", bj["name"])
	assert.Equal(t, float64(0), bj["schools"])
	assert.Equal(t, float64(0), bj["openRate"])
}

func TestGETCities_WithStats(t *testing.T) {
	gin.SetMode(gin.TestMode)
	repoS := newTestRepo(t,
		&models.School{ID: "a", CityID: "bj", Name: "A", Status: "open", LastUpdate: mustTime("2026-05-01T00:00:00Z")},
		&models.School{ID: "b", CityID: "bj", Name: "B", Status: "open", LastUpdate: mustTime("2026-05-01T00:00:00Z")},
		&models.School{ID: "c", CityID: "bj", Name: "C", Status: "appt", LastUpdate: mustTime("2026-05-01T00:00:00Z")},
	)

	r := gin.New()
	r.GET("/api/v1/cities", Cities(repoS))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/cities", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var body struct {
		Cities []map[string]any `json:"cities"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))

	var bj map[string]any
	for _, c := range body.Cities {
		if c["id"] == "bj" {
			bj = c
		}
	}
	require.NotNil(t, bj)
	assert.Equal(t, float64(3), bj["schools"])
	assert.InDelta(t, 2.0/3.0, bj["openRate"], 0.001)
}
