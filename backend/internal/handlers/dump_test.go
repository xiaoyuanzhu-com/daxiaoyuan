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

func TestGETDump_Shape(t *testing.T) {
	gin.SetMode(gin.TestMode)
	d, err := db.Open(":memory:")
	require.NoError(t, err)
	defer d.Close()

	_, err = d.Exec(`INSERT INTO schools (id, city_id, name, lat, lng, status,
		library_status, track_status, gym_status, canteen_status, last_update)
		VALUES ('pku','bj','北京大学',0,0,'appt','closed','closed','closed','closed','2026-05-09T00:00:00Z')`)
	require.NoError(t, err)

	r := gin.New()
	r.GET("/api/v1/dump.json", Dump(repo.NewSchools(d)))

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
