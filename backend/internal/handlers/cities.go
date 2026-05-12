package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/data"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/models"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/repo"
)

func Cities(schools *repo.Schools) gin.HandlerFunc {
	return func(c *gin.Context) {
		stats, err := schools.CountByCity(c.Request.Context())
		if err != nil {
			writeError(c, http.StatusInternalServerError, err.Error())
			return
		}

		all := data.Cities()
		out := make([]models.CityWithStats, 0, len(all))
		for _, city := range all {
			s := stats[city.ID]
			rate := 0.0
			if s.Total > 0 {
				rate = float64(s.Open) / float64(s.Total)
			}
			out = append(out, models.CityWithStats{
				ID: city.ID, Name: city.Name, Country: city.Country,
				Code: city.Code, Lat: city.Lat, Lng: city.Lng, Active: city.Active,
				Schools:  s.Total,
				OpenRate: rate,
			})
		}
		c.JSON(http.StatusOK, gin.H{"cities": out})
	}
}
