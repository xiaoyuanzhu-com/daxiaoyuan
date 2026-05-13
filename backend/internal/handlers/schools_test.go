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

func seedTwoSchools(t *testing.T) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	d, err := db.Open(":memory:")
	require.NoError(t, err)
	t.Cleanup(func() { d.Close() })

	_, err = d.Exec(`INSERT INTO schools (id, city_id, name, address, lat, lng, status, reservation,
		library_status, library_reservation,
		track_status, track_reservation,
		gym_status, gym_reservation,
		canteen_status, canteen_reservation,
		others, last_update)
		VALUES
		('pku','bj','北京大学','北京市海淀区颐和园路 5 号',39.992,116.305,'appt',
		 '{"qrcodeUrl":"https://x/qr.png","hint":"h","link":"https://visit.pku.edu.cn"}',
		 'closed', NULL,
		 'closed', NULL,
		 'closed', NULL,
		 'closed', NULL,
		 NULL,
		 '2026-05-09T08:30:00Z'),
		('fudan','sh','复旦大学',NULL,31.30,121.50,'open',NULL,
		 'open', NULL,
		 'open', NULL,
		 'open', NULL,
		 'open', NULL,
		 NULL,
		 '2026-05-09T00:00:00Z')`)
	require.NoError(t, err)

	r := gin.New()
	repoS := repo.NewSchools(d)
	r.GET("/api/v1/schools", SchoolsList(repoS))
	r.GET("/api/v1/schools/:id", SchoolDetail(repoS))
	return r
}

func TestGETSchools_List_All(t *testing.T) {
	r := seedTwoSchools(t)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/schools", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var body struct {
		Schools []map[string]any `json:"schools"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Len(t, body.Schools, 2)
	assert.Equal(t, "fudan", body.Schools[0]["id"]) // alphabetical order
	assert.Equal(t, "pku", body.Schools[1]["id"])
	// Summary shape includes facility statuses (key → status) so list views
	// can show per-facility openness without a per-school detail fetch.
	// It MUST NOT include reservation / others.
	facs := body.Schools[1]["facilities"].(map[string]any)
	assert.Equal(t, "closed", facs["library"])
	assert.Equal(t, "closed", facs["track"])
	assert.Equal(t, "closed", facs["gym"])
	assert.Equal(t, "closed", facs["canteen"])
	assert.NotContains(t, body.Schools[1], "reservation")
	assert.NotContains(t, body.Schools[1], "others")
}

func TestGETSchools_List_FilterByCity(t *testing.T) {
	r := seedTwoSchools(t)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/schools?city=bj", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var body struct {
		Schools []map[string]any `json:"schools"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Len(t, body.Schools, 1)
	assert.Equal(t, "pku", body.Schools[0]["id"])
}

func TestGETSchool_Detail_OK(t *testing.T) {
	r := seedTwoSchools(t)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/schools/pku", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var body struct {
		School map[string]any `json:"school"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	s := body.School
	assert.Equal(t, "pku", s["id"])
	assert.Equal(t, "appt", s["status"])
	r2 := s["reservation"].(map[string]any)
	assert.Equal(t, "https://x/qr.png", r2["qrcodeUrl"])
	facs := s["facilities"].(map[string]any)
	assert.Len(t, facs, 4)
}

func TestGETSchool_Detail_NotFound(t *testing.T) {
	r := seedTwoSchools(t)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/schools/missing", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusNotFound, w.Code)
	var body map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Equal(t, "school not found", body["error"])
}
