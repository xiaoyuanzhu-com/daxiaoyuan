package main

import (
	"log"

	"github.com/gin-gonic/gin"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/config"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/data"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/repo"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/server"
)

const dataDir = "./data"

func main() {
	cfg := config.Load()
	if cfg.LogLevel != "debug" {
		gin.SetMode(gin.ReleaseMode)
	}

	if err := data.Load(dataDir + "/cities.json"); err != nil {
		log.Fatalf("data.Load cities: %v", err)
	}

	schools, err := repo.NewSchools(dataDir)
	if err != nil {
		log.Fatalf("repo.NewSchools: %v", err)
	}

	r := server.NewRouter(schools, cfg)
	log.Printf("ddxy backend listening on %s (schools=%d)", cfg.Addr, schools.Len())
	if err := r.Run(cfg.Addr); err != nil {
		log.Fatalf("server.Run: %v", err)
	}
}
