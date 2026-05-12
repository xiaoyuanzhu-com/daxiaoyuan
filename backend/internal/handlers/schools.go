package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/repo"
)

func SchoolsList(schools *repo.Schools) gin.HandlerFunc {
	return func(c *gin.Context) {
		city := c.Query("city")
		out, err := schools.List(c.Request.Context(), city)
		if err != nil {
			writeError(c, http.StatusInternalServerError, err.Error())
			return
		}
		c.JSON(http.StatusOK, gin.H{"schools": out})
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
