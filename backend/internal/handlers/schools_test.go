package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/models"
)

func mustTime(s string) time.Time {
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		panic(err)
	}
	return t
}

func seedTwoSchools(t *testing.T) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	repoS := newTestRepo(t,
		&models.School{
			ID: "pku", CityID: "bj", Name: "北京大学", Address: "北京市海淀区颐和园路 5 号",
			Lat: 39.992, Lng: 116.305, Status: "appt",
			Reservation: &models.Reservation{
				QrcodeUrl: "https://x/qr.png", Hint: "h", Link: "https://visit.pku.edu.cn",
			},
			LastUpdate: mustTime("2026-05-09T08:30:00Z"),
		},
		&models.School{
			ID: "fudan", CityID: "sh", Name: "复旦大学",
			Lat: 31.30, Lng: 121.50, Status: "open",
			Facilities: map[string]models.Facility{
				"library": {Status: "open"},
				"track":   {Status: "open"},
				"gym":     {Status: "open"},
				"canteen": {Status: "open"},
			},
			LastUpdate: mustTime("2026-05-09T00:00:00Z"),
		},
	)

	r := gin.New()
	r.GET("/api/v1/schools", SchoolsList(repoS))
	r.POST("/api/v1/schools", SchoolCreate(repoS))
	r.GET("/api/v1/schools/:id", SchoolDetail(repoS))
	r.PUT("/api/v1/schools/:id", SchoolUpdate(repoS))
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
	// Order is lastUpdate DESC: pku (08:30Z) before fudan (00:00Z).
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

func putJSON(t *testing.T, r *gin.Engine, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	b, err := json.Marshal(body)
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPut, path, bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func validPKUBody() map[string]any {
	return map[string]any{
		"id":      "pku",
		"cityId":  "bj",
		"name":    "北京大学",
		"address": "北京市海淀区颐和园路 5 号",
		"lat":     39.992,
		"lng":     116.305,
		"status":  "appt",
		"reservation": map[string]any{
			"qrcodeUrl": "https://x/new-qr.png",
			"hint":      "扫码预约",
			"link":      "https://visit.pku.edu.cn",
		},
		"facilities": map[string]any{
			"library": map[string]any{"status": "closed"},
			"track":   map[string]any{"status": "open"},
			"gym":     map[string]any{"status": "closed"},
			"canteen": map[string]any{"status": "closed"},
		},
		"others": []any{},
	}
}

func TestPUTSchool_Update_OK(t *testing.T) {
	r := seedTwoSchools(t)
	body := validPKUBody()
	body["name"] = "北京大学（更新）"
	w := putJSON(t, r, "/api/v1/schools/pku", body)

	require.Equal(t, http.StatusOK, w.Code)
	var resp struct {
		School map[string]any `json:"school"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "北京大学（更新）", resp.School["name"])
	resv := resp.School["reservation"].(map[string]any)
	assert.Equal(t, "https://x/new-qr.png", resv["qrcodeUrl"])
	facs := resp.School["facilities"].(map[string]any)
	assert.Equal(t, "open", facs["track"].(map[string]any)["status"])
	// lastUpdate is server-set on PUT — must be present and non-empty.
	assert.NotEmpty(t, resp.School["lastUpdate"])
}

func TestPUTSchool_NotFound(t *testing.T) {
	r := seedTwoSchools(t)
	body := validPKUBody()
	body["id"] = "ghost"
	w := putJSON(t, r, "/api/v1/schools/ghost", body)
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestPUTSchool_IDMismatch(t *testing.T) {
	r := seedTwoSchools(t)
	body := validPKUBody()
	body["id"] = "tsinghua"
	w := putJSON(t, r, "/api/v1/schools/pku", body)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestPUTSchool_InvalidStatus(t *testing.T) {
	r := seedTwoSchools(t)
	body := validPKUBody()
	body["status"] = "bogus"
	w := putJSON(t, r, "/api/v1/schools/pku", body)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestPUTSchool_MissingFacility(t *testing.T) {
	r := seedTwoSchools(t)
	body := validPKUBody()
	delete(body["facilities"].(map[string]any), "gym")
	w := putJSON(t, r, "/api/v1/schools/pku", body)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestPUTSchool_UnknownCity(t *testing.T) {
	r := seedTwoSchools(t)
	body := validPKUBody()
	body["cityId"] = "atlantis"
	w := putJSON(t, r, "/api/v1/schools/pku", body)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func postJSON(t *testing.T, r *gin.Engine, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	b, err := json.Marshal(body)
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(b))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func validNewSchoolBody() map[string]any {
	return map[string]any{
		"id":      "ruc",
		"cityId":  "bj",
		"name":    "中国人民大学",
		"address": "北京市海淀区中关村大街 59 号",
		"lat":     39.969,
		"lng":     116.319,
		"status":  "open",
		"facilities": map[string]any{
			"library": map[string]any{"status": "closed"},
			"track":   map[string]any{"status": "open"},
			"gym":     map[string]any{"status": "closed"},
			"canteen": map[string]any{"status": "open"},
		},
		"others": []any{},
	}
}

func TestPOSTSchool_Create_OK(t *testing.T) {
	r := seedTwoSchools(t)
	w := postJSON(t, r, "/api/v1/schools", validNewSchoolBody())

	require.Equal(t, http.StatusCreated, w.Code)
	var resp struct {
		School map[string]any `json:"school"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "ruc", resp.School["id"])
	assert.Equal(t, "中国人民大学", resp.School["name"])
	assert.NotEmpty(t, resp.School["lastUpdate"])

	// And it's actually persisted — readable via GET.
	getReq := httptest.NewRequest(http.MethodGet, "/api/v1/schools/ruc", nil)
	getW := httptest.NewRecorder()
	r.ServeHTTP(getW, getReq)
	assert.Equal(t, http.StatusOK, getW.Code)
}

func TestPOSTSchool_Conflict(t *testing.T) {
	r := seedTwoSchools(t)
	body := validNewSchoolBody()
	body["id"] = "pku" // already seeded
	w := postJSON(t, r, "/api/v1/schools", body)
	assert.Equal(t, http.StatusConflict, w.Code)
}

func TestPOSTSchool_BadSlug(t *testing.T) {
	r := seedTwoSchools(t)
	for _, badID := range []string{"", "PKU", "北大", "pku!", "pku.edu", "pku/edu"} {
		body := validNewSchoolBody()
		body["id"] = badID
		w := postJSON(t, r, "/api/v1/schools", body)
		assert.Equal(t, http.StatusBadRequest, w.Code, "id=%q", badID)
	}
}

func TestPOSTSchool_BadValidation(t *testing.T) {
	r := seedTwoSchools(t)
	// Missing one of the four required facilities.
	body := validNewSchoolBody()
	delete(body["facilities"].(map[string]any), "gym")
	w := postJSON(t, r, "/api/v1/schools", body)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}
