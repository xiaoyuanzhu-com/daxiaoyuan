package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/repo"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/search"
)

const (
	defaultPageSize = 10
	maxPageSize     = 50
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
