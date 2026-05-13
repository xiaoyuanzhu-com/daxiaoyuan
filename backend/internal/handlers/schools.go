package handlers

import (
	"errors"
	"net/http"
	"regexp"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/data"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/models"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/repo"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/search"
)

const (
	defaultPageSize = 10
	maxPageSize     = 50
)

var (
	validStatuses  = map[string]bool{"open": true, "appt": true, "alumni": true, "closed": true}
	facilityKeys   = []string{"library", "track", "gym", "canteen"}
	facilityKeySet = func() map[string]bool {
		m := map[string]bool{}
		for _, k := range facilityKeys {
			m[k] = true
		}
		return m
	}()
	// School id slug — lowercase letters, digits, hyphens.
	// Per CLAUDE.md: derived from "https://www.<X>.edu.cn" subdomain (pku, tsinghua, …).
	slugRe = regexp.MustCompile(`^[a-z0-9-]+$`)
)

// SchoolsList returns one page of full School records. Supports:
//   - city: filter by city slug
//   - q:    fuzzy match against Chinese name / pinyin / pinyin initials / id
//   - page, size: 1-based pagination (size capped at maxPageSize)
func SchoolsList(schools *repo.Schools) gin.HandlerFunc {
	return func(c *gin.Context) {
		page, _ := strconv.Atoi(c.Query("page"))
		if page < 1 {
			page = 1
		}
		size, _ := strconv.Atoi(c.Query("size"))
		if size < 1 {
			size = defaultPageSize
		}
		if size > maxPageSize {
			size = maxPageSize
		}

		res, err := schools.List(c.Request.Context(), repo.ListParams{
			CityID:   c.Query("city"),
			Query:    search.Normalize(c.Query("q")),
			Page:     page,
			PageSize: size,
		})
		if err != nil {
			writeError(c, http.StatusInternalServerError, err.Error())
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"schools": res.Schools,
			"page":    res.Page,
			"size":    size,
			"total":   res.Total,
			"hasMore": res.HasMore,
		})
	}
}

func SchoolDetail(schools *repo.Schools) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		out, err := schools.Get(c.Request.Context(), id)
		if err != nil {
			if errors.Is(err, repo.ErrNotFound) {
				writeError(c, http.StatusNotFound, "school not found")
				return
			}
			writeError(c, http.StatusInternalServerError, err.Error())
			return
		}
		c.JSON(http.StatusOK, gin.H{"school": out})
	}
}

// SchoolCreate inserts a new school. id comes from the body (slug-format).
// Returns 409 if a school with that id already exists — never silently
// overwrites. lastUpdate is server-set; client value is ignored.
func SchoolCreate(schools *repo.Schools) gin.HandlerFunc {
	return func(c *gin.Context) {
		var in models.School
		if err := c.ShouldBindJSON(&in); err != nil {
			writeError(c, http.StatusBadRequest, "invalid json: "+err.Error())
			return
		}
		if in.ID == "" {
			writeError(c, http.StatusBadRequest, "id is required")
			return
		}
		if !slugRe.MatchString(in.ID) {
			writeError(c, http.StatusBadRequest, "id must be lowercase letters, digits, and hyphens (e.g. 'pku')")
			return
		}
		if msg := validateSchool(&in); msg != "" {
			writeError(c, http.StatusBadRequest, msg)
			return
		}
		_, err := schools.Get(c.Request.Context(), in.ID)
		if err == nil {
			writeError(c, http.StatusConflict, "school already exists: "+in.ID)
			return
		}
		if !errors.Is(err, repo.ErrNotFound) {
			writeError(c, http.StatusInternalServerError, err.Error())
			return
		}
		in.LastUpdate = time.Now().UTC()
		if err := schools.Insert(c.Request.Context(), &in); err != nil {
			writeError(c, http.StatusInternalServerError, err.Error())
			return
		}
		out, err := schools.Get(c.Request.Context(), in.ID)
		if err != nil {
			writeError(c, http.StatusInternalServerError, err.Error())
			return
		}
		c.JSON(http.StatusCreated, gin.H{"school": out})
	}
}

// SchoolUpdate replaces an existing school's record with the body.
// Update-only: returns 404 if the school doesn't already exist (no auto-create).
// Body must be a full School (same shape as GET returns); id in body must
// match :id in URL. lastUpdate is server-set; any value sent by client is ignored.
func SchoolUpdate(schools *repo.Schools) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var in models.School
		if err := c.ShouldBindJSON(&in); err != nil {
			writeError(c, http.StatusBadRequest, "invalid json: "+err.Error())
			return
		}
		if in.ID != "" && in.ID != id {
			writeError(c, http.StatusBadRequest, "id in body does not match url")
			return
		}
		in.ID = id
		if msg := validateSchool(&in); msg != "" {
			writeError(c, http.StatusBadRequest, msg)
			return
		}
		if _, err := schools.Get(c.Request.Context(), id); err != nil {
			if errors.Is(err, repo.ErrNotFound) {
				writeError(c, http.StatusNotFound, "school not found")
				return
			}
			writeError(c, http.StatusInternalServerError, err.Error())
			return
		}
		in.LastUpdate = time.Now().UTC()
		if err := schools.Insert(c.Request.Context(), &in); err != nil {
			writeError(c, http.StatusInternalServerError, err.Error())
			return
		}
		out, err := schools.Get(c.Request.Context(), id)
		if err != nil {
			writeError(c, http.StatusInternalServerError, err.Error())
			return
		}
		c.JSON(http.StatusOK, gin.H{"school": out})
	}
}

func validateSchool(s *models.School) string {
	if s.Name == "" {
		return "name is required"
	}
	if _, ok := data.CityByID(s.CityID); !ok {
		return "unknown cityId: " + s.CityID
	}
	if !validStatuses[s.Status] {
		return "invalid status: " + s.Status
	}
	if len(s.Facilities) != len(facilityKeys) {
		return "facilities must contain exactly: library, track, gym, canteen"
	}
	for _, k := range facilityKeys {
		f, ok := s.Facilities[k]
		if !ok {
			return "missing facility: " + k
		}
		if !validStatuses[f.Status] {
			return "invalid facility status for " + k + ": " + f.Status
		}
	}
	for k := range s.Facilities {
		if !facilityKeySet[k] {
			return "unknown facility key: " + k
		}
	}
	for i, o := range s.Others {
		if o.Kind == "" || o.Name == "" {
			return "others[" + strconv.Itoa(i) + "]: kind and name are required"
		}
		if !validStatuses[o.Status] {
			return "others[" + strconv.Itoa(i) + "]: invalid status: " + o.Status
		}
	}
	return ""
}
