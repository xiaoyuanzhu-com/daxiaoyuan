package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/db"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/repo"
)

func TestGETCities_EmptyDB(t *testing.T) {
	gin.SetMode(gin.TestMode)
	d, err := db.Open(":memory:")
	require.NoError(t, err)
	defer d.Close()

	r := gin.New()
	r.GET("/api/v1/cities", Cities(repo.NewSchools(d)))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/cities", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var body struct {
		Cities []map[string]any `json:"cities"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Len(t, body.Cities, 8, "should return all 8 cities from cities.json")

	// bj is first and has zero schools when DB is empty.
	bj := body.Cities[0]
	assert.Equal(t, "bj", bj["id"])
	assert.Equal(t, "北京", bj["name"])
	assert.Equal(t, float64(0), bj["schools"])
	assert.Equal(t, float64(0), bj["openRate"])
}

func TestGETCities_WithStats(t *testing.T) {
	gin.SetMode(gin.TestMode)
	d, err := db.Open(":memory:")
	require.NoError(t, err)
	defer d.Close()

	// Insert 2 open schools + 1 appt school in bj.
	_, err = d.Exec(`INSERT INTO schools (id, city_id, name, lat, lng, status,
		library_status, track_status, gym_status, canteen_status, last_update)
		VALUES
		('a','bj','A',0,0,'open','closed','closed','closed','closed', CURRENT_TIMESTAMP),
		('b','bj','B',0,0,'open','closed','closed','closed','closed', CURRENT_TIMESTAMP),
		('c','bj','C',0,0,'appt','closed','closed','closed','closed', CURRENT_TIMESTAMP)`)
	require.NoError(t, err)

	r := gin.New()
	r.GET("/api/v1/cities", Cities(repo.NewSchools(d)))

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
