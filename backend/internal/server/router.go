package server

import (
	"database/sql"
	"log"

	"github.com/gin-gonic/gin"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/config"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/handlers"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/repo"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/web"
)

func NewRouter(db *sql.DB, cfg config.Config) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery(), cors())

	schools := repo.NewSchools(db)

	v1 := r.Group("/api/v1")
	v1.GET("/cities", handlers.Cities(schools))
	v1.GET("/schools", handlers.SchoolsList(schools))
	v1.GET("/schools/:id", handlers.SchoolDetail(schools))
	v1.GET("/dump.json", handlers.Dump(schools))

	v1.GET("/rankings/c9", handlers.RankingsC9(schools))
	v1.GET("/rankings/985", handlers.Rankings985(schools))
	v1.GET("/rankings/211", handlers.Rankings211(schools))
	v1.GET("/rankings/qs30", handlers.RankingsQS30(schools))

	admin := v1.Group("", bearerAuth(cfg.AdminToken))
	admin.POST("/schools", handlers.SchoolCreate(schools))
	admin.PUT("/schools/:id", handlers.SchoolUpdate(schools))
	if cfg.AdminToken == "" {
		log.Printf("WARN: DDXY_ADMIN_TOKEN not set — write endpoints will return 401 for all requests")
	}

	r.GET("/healthz", func(c *gin.Context) {
		c.String(200, "ok")
	})

	if err := web.RegisterRoutes(r); err != nil {
		log.Printf("web: SPA bundle unavailable, serving API only: %v", err)
	}

	return r
}
