package server

import (
	"database/sql"

	"github.com/gin-gonic/gin"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/handlers"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/repo"
)

func NewRouter(db *sql.DB) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery(), cors())

	schools := repo.NewSchools(db)

	v1 := r.Group("/api/v1")
	v1.GET("/cities", handlers.Cities(schools))
	v1.GET("/schools", handlers.SchoolsList(schools))
	v1.POST("/schools", handlers.SchoolCreate(schools))
	v1.GET("/schools/:id", handlers.SchoolDetail(schools))
	v1.PUT("/schools/:id", handlers.SchoolUpdate(schools))
	v1.GET("/dump.json", handlers.Dump(schools))

	v1.GET("/rankings/c9", handlers.RankingsC9(schools))
	v1.GET("/rankings/985", handlers.Rankings985(schools))
	v1.GET("/rankings/211", handlers.Rankings211(schools))
	v1.GET("/rankings/qs30", handlers.RankingsQS30(schools))

	r.GET("/healthz", func(c *gin.Context) {
		c.String(200, "ok")
	})

	return r
}
