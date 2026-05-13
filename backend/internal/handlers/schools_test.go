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
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/search"
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
		others, search_text, last_update)
		VALUES
		('pku','bj','北京大学','北京市海淀区颐和园路 5 号',39.992,116.305,'appt',
		 '{"qrcodeUrl":"https://x/qr.png","hint":"h","link":"https://visit.pku.edu.cn"}',
		 'closed', NULL,
		 'closed', NULL,
		 'closed', NULL,
		 'closed', NULL,
		 NULL, ?,
		 '2026-05-09T08:30:00Z'),
		('fudan','sh','复旦大学',NULL,31.30,121.50,'open',NULL,
		 'open', NULL,
		 'open', NULL,
		 'open', NULL,
		 'open', NULL,
		 NULL, ?,
		 '2026-05-09T00:00:00Z')`,
		search.BuildText("北京大学", "pku"),
		search.BuildText("复旦大学", "fudan"),
	)
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
		Page    int              `json:"page"`
		Size    int              `json:"size"`
		Total   int              `json:"total"`
		HasMore bool             `json:"hasMore"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Len(t, body.Schools, 2)
	assert.Equal(t, 1, body.Page)
	assert.Equal(t, 10, body.Size)
	assert.Equal(t, 2, body.Total)
	assert.False(t, body.HasMore)
	// Order is last_update DESC: pku (2026-05-09) before fudan (2026-05-09T00).
	assert.Equal(t, "pku", body.Schools[0]["id"])
	assert.Equal(t, "fudan", body.Schools[1]["id"])
	// Full School shape — facilities expand to {status, reservation}, plus
	// top-level reservation + others are present.
	facs := body.Schools[0]["facilities"].(map[string]any)
	lib := facs["library"].(map[string]any)
	assert.Equal(t, "closed", lib["status"])
	assert.Contains(t, body.Schools[0], "reservation")
	assert.Contains(t, body.Schools[0], "others")
}

func TestGETSchools_List_FuzzyQuery(t *testing.T) {
	r := seedTwoSchools(t)
	for _, q := range []string{"北", "bei", "pku", "bjdx"} {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/schools?q="+q, nil)
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		require.Equal(t, http.StatusOK, w.Code, "q=%s", q)
		var body struct {
			Schools []map[string]any `json:"schools"`
		}
		require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
		require.Len(t, body.Schools, 1, "q=%s", q)
		assert.Equal(t, "pku", body.Schools[0]["id"], "q=%s", q)
	}
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
