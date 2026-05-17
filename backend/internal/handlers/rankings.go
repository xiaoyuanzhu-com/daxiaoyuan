package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/data"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/models"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/repo"
)

func RankingsC9(schools *repo.Schools) gin.HandlerFunc {
	return rankingsHandler(schools, "c9", "C9联盟", data.C9Order)
}

func Rankings985(schools *repo.Schools) gin.HandlerFunc {
	return rankingsHandler(schools, "985", "985工程", data.Order985)
}

func Rankings211(schools *repo.Schools) gin.HandlerFunc {
	return rankingsHandler(schools, "211", "211工程", data.Order211)
}

func RankingsQS30(schools *repo.Schools) gin.HandlerFunc {
	return rankingsHandler(schools, "qs30", "QS Top 30", data.OrderQS30)
}

func RankingsShuangYiLiu(schools *repo.Schools) gin.HandlerFunc {
	return rankingsHandler(schools, "shuangyiliu", "双一流", data.OrderShuangYiLiu)
}

func rankingsHandler(schools *repo.Schools, category, label string, order []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		all, err := schools.ListByIDs(c.Request.Context(), order)
		if err != nil {
			writeError(c, http.StatusInternalServerError, err.Error())
			return
		}
		out := make([]*rankedSchool, 0, len(all))
		for i, sch := range all {
			out = append(out, &rankedSchool{School: sch, Rank: i + 1})
		}
		c.JSON(http.StatusOK, gin.H{
			"category": category,
			"label":    label,
			"schools":  out,
		})
	}
}

type rankedSchool struct {
	*models.School // embedded — inherits all JSON fields
	Rank int `json:"rank"`
}
