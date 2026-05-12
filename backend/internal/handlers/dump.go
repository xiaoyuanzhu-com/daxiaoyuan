package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/data"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/models"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/repo"
)

func Dump(schools *repo.Schools) gin.HandlerFunc {
	return func(c *gin.Context) {
		stats, err := schools.CountByCity(c.Request.Context())
		if err != nil {
			writeError(c, http.StatusInternalServerError, err.Error())
			return
		}
		all, err := schools.ListAllDetail(c.Request.Context())
		if err != nil {
			writeError(c, http.StatusInternalServerError, err.Error())
			return
		}

		// Cities with aggregates (same shape as /api/v1/cities response).
		cs := data.Cities()
		cities := make([]models.CityWithStats, 0, len(cs))
		for _, city := range cs {
			s := stats[city.ID]
			rate := 0.0
			if s.Total > 0 {
				rate = float64(s.Open) / float64(s.Total)
			}
			cities = append(cities, models.CityWithStats{
				ID: city.ID, Name: city.Name, Country: city.Country,
				Code: city.Code, Lat: city.Lat, Lng: city.Lng, Active: city.Active,
				Schools:  s.Total,
				OpenRate: rate,
			})
		}

		c.JSON(http.StatusOK, gin.H{
			"generatedAt": time.Now().UTC().Format(time.RFC3339),
			"cities":      cities,
			"schools":     all,
		})
	}
}
