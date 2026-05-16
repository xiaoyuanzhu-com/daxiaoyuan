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

func rankingsHandler(schools *repo.Schools, category, label string, order []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		all, err := schools.ListByIDs(c.Request.Context(), order)
		if err != nil {
			writeError(c, http.StatusInternalServerError, err.Error())
			return
		}
		index := map[string]int{}
		for i, id := range order {
			index[id] = i
		}
		out := make([]*rankedSchool, 0, len(all))
		for _, sch := range all {
			out = append(out, &rankedSchool{School: sch, Rank: index[sch.ID] + 1})
		}
		sortByRank(out)
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

// sortByRank orders in-place by ascending Rank using insertion sort (small N).
func sortByRank(schools []*rankedSchool) {
	for i := 1; i < len(schools); i++ {
		for j := i; j > 0 && schools[j].Rank < schools[j-1].Rank; j-- {
			schools[j], schools[j-1] = schools[j-1], schools[j]
		}
	}
}
