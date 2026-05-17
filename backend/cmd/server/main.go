package main

import (
	"log"

	"github.com/gin-gonic/gin"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/config"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/db"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/server"
)

func main() {
	cfg := config.Load()
	if cfg.LogLevel != "debug" {
		gin.SetMode(gin.ReleaseMode)
	}

	d, err := db.Open(cfg.DBPath)
	if err != nil {
		log.Fatalf("db open: %v", err)
	}
	defer d.Close()

	r := server.NewRouter(d, cfg)
	log.Printf("ddxy backend listening on %s (db=%s)", cfg.Addr, cfg.DBPath)
	if err := r.Run(cfg.Addr); err != nil {
		log.Fatalf("server.Run: %v", err)
	}
}
