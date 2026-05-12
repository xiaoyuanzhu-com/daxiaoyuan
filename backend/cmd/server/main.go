package main

import (
	"log"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/config"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/db"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/server"
)

func main() {
	cfg := config.Load()

	d, err := db.Open(cfg.DBPath)
	if err != nil {
		log.Fatalf("db open: %v", err)
	}
	defer d.Close()

	r := server.NewRouter(d)
	log.Printf("ddxy backend listening on %s (db=%s)", cfg.Addr, cfg.DBPath)
	if err := r.Run(cfg.Addr); err != nil {
		log.Fatalf("server.Run: %v", err)
	}
}
