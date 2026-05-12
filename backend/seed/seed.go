package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/config"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/db"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/models"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/repo"
)

func main() {
	jsonPath := flag.String("file", "seed/schools.json", "path to schools.json")
	flag.Parse()

	cfg := config.Load()
	data, err := os.ReadFile(*jsonPath)
	if err != nil {
		log.Fatalf("read %s: %v", *jsonPath, err)
	}

	d, err := db.Open(cfg.DBPath)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer d.Close()

	r := repo.NewSchools(d)
	n, err := importSchools(context.Background(), r, data)
	if err != nil {
		log.Fatalf("import: %v", err)
	}
	fmt.Printf("imported %d schools into %s\n", n, cfg.DBPath)
}

// importSchools parses the JSON payload and inserts each school. Returns
// the number imported. Aborts on the first error.
func importSchools(ctx context.Context, r *repo.Schools, payload []byte) (int, error) {
	var schools []models.School
	if err := json.Unmarshal(payload, &schools); err != nil {
		return 0, fmt.Errorf("parse json: %w", err)
	}
	for i := range schools {
		s := &schools[i]
		if s.Facilities == nil {
			s.Facilities = map[string]models.Facility{}
		}
		// Fill in defaults: missing facilities default to "closed", missing
		// LastUpdate stays zero (DB will accept it but seeding without one
		// is a mistake — keep it explicit).
		for _, k := range []string{"library", "track", "gym", "canteen"} {
			if _, ok := s.Facilities[k]; !ok {
				s.Facilities[k] = models.Facility{Status: "closed"}
			}
		}
		if s.Others == nil {
			s.Others = []models.Other{}
		}
		if err := r.Insert(ctx, s); err != nil {
			return 0, fmt.Errorf("insert %s: %w", s.ID, err)
		}
	}
	return len(schools), nil
}
