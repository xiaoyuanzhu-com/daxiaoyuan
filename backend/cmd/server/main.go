package main

import (
	"log"
	"path/filepath"

	"github.com/gin-gonic/gin"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/config"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/data"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/repo"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/server"
)

func main() {
	cfg := config.Load()
	if cfg.LogLevel != "debug" {
		gin.SetMode(gin.ReleaseMode)
	}

	if err := data.Load(filepath.Join(cfg.DataDir, "cities.json")); err != nil {
		log.Fatalf("data.Load cities: %v", err)
	}

	schools, err := repo.NewSchools(cfg.DataDir)
	if err != nil {
		log.Fatalf("repo.NewSchools: %v", err)
	}

	r := server.NewRouter(schools, cfg)
	log.Printf("ddxy backend listening on %s (data=%s, schools=%d)", cfg.Addr, cfg.DataDir, schools.Len())
	if err := r.Run(cfg.Addr); err != nil {
		log.Fatalf("server.Run: %v", err)
	}
}
