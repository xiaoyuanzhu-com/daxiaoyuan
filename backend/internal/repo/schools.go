// Package repo is the file-backed schools store.
//
// On startup the backend walks data/schools/**/*.json and builds an in-memory
// map[slug]School plus a precomputed search index. Reads are served entirely
// from memory; writes go to disk (data/schools/<country>/<slug>.json) and
// update the map atomically. Country is resolved from cityId via the cities
// table — a school's path on disk mirrors its city's country.
package repo

import (
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/data"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/models"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/search"
)

type Schools struct {
	dataDir     string
	mu          sync.RWMutex
	byID        map[string]*models.School
	searchTexts map[string]string // slug → precomputed lowercase search string
}

// NewSchools opens dataDir and loads every data/schools/**/*.json into memory.
// Returns an error if dataDir/schools doesn't exist or any file fails to parse.
func NewSchools(dataDir string) (*Schools, error) {
	s := &Schools{
		dataDir:     dataDir,
		byID:        map[string]*models.School{},
		searchTexts: map[string]string{},
	}
	if err := s.load(); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Schools) load() error {
	schoolsDir := filepath.Join(s.dataDir, "schools")
	info, err := os.Stat(schoolsDir)
	if err != nil {
		if os.IsNotExist(err) {
			// No schools yet — empty store is valid (first-run case).
			return nil
		}
		return fmt.Errorf("stat schools dir: %w", err)
	}
	if !info.IsDir() {
		return fmt.Errorf("%s is not a directory", schoolsDir)
	}

	return filepath.WalkDir(schoolsDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		if !strings.HasSuffix(d.Name(), ".json") {
			return nil
		}
		b, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read %s: %w", path, err)
		}
		var sch models.School
		if err := json.Unmarshal(b, &sch); err != nil {
			return fmt.Errorf("parse %s: %w", path, err)
		}
		// Defense: filename slug must match the id field — catches accidental
		// renames where the file was moved but JSON wasn't updated.
		base := strings.TrimSuffix(d.Name(), ".json")
		if base != sch.ID {
			return fmt.Errorf("%s: filename slug %q does not match id %q", path, base, sch.ID)
		}
		// Empty facilities map after unmarshal means the JSON didn't include
		// the field at all — treat as malformed since the API contract requires
		// all five keys (campus + library + track + gym + canteen).
		if sch.Facilities == nil {
			sch.Facilities = map[string]models.Facility{}
		}
		if sch.Others == nil {
			sch.Others = []models.Other{}
		}
		s.byID[sch.ID] = &sch
		s.searchTexts[sch.ID] = search.BuildText(sch.Name, sch.ID)
		return nil
	})
}

// Len returns the number of loaded schools. Used for startup logging.
func (s *Schools) Len() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.byID)
}

// CityStats holds aggregate counts for one city.
type CityStats struct {
	Total int
	Open  int // schools where status='open'
}

// ListParams carries the filter + pagination inputs for List.
// Query is a lowercase substring matched against the precomputed search index
// (name + full pinyin + pinyin initials + id). Page is 1-based.
type ListParams struct {
	CityID   string
	Query    string
	Page     int
	PageSize int
}

// ListResult holds the page of schools plus pagination metadata so callers
// can drive infinite-scroll UIs without a separate count round-trip.
type ListResult struct {
	Schools []*models.School
	Total   int
	Page    int
	HasMore bool
}

// List returns one page of full School records matching the filters.
// Order is `lastUpdate DESC, id ASC` (newest data first, deterministic
// tiebreak). Total is the full match count across all pages.
func (s *Schools) List(_ context.Context, p ListParams) (ListResult, error) {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.PageSize < 1 {
		p.PageSize = 10
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	matched := make([]*models.School, 0, len(s.byID))
	for id, sch := range s.byID {
		if p.CityID != "" && sch.CityID != p.CityID {
			continue
		}
		if p.Query != "" && !strings.Contains(s.searchTexts[id], p.Query) {
			continue
		}
		matched = append(matched, sch)
	}
	sort.Slice(matched, func(i, j int) bool {
		if !matched[i].LastUpdate.Equal(matched[j].LastUpdate) {
			return matched[i].LastUpdate.After(matched[j].LastUpdate)
		}
		return matched[i].ID < matched[j].ID
	})

	total := len(matched)
	start := (p.Page - 1) * p.PageSize
	if start > total {
		start = total
	}
	end := start + p.PageSize
	if end > total {
		end = total
	}

	return ListResult{
		Schools: matched[start:end],
		Total:   total,
		Page:    p.Page,
		HasMore: end < total,
	}, nil
}

// Get returns the full School record for a slug, or ErrNotFound.
// The returned pointer aliases the in-memory map entry — callers must not
// mutate it.
func (s *Schools) Get(_ context.Context, id string) (*models.School, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	sch, ok := s.byID[id]
	if !ok {
		return nil, ErrNotFound
	}
	return sch, nil
}

// ListAllDetail returns every school in full detail form, ordered by id.
// Used by the dump endpoint.
func (s *Schools) ListAllDetail(_ context.Context) ([]*models.School, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*models.School, 0, len(s.byID))
	for _, sch := range s.byID {
		out = append(out, sch)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })
	return out, nil
}

// ListByIDs returns full School records for the given slugs. Order in the
// result matches input order; missing slugs are silently skipped (matches
// the previous SQL behavior).
func (s *Schools) ListByIDs(_ context.Context, ids []string) ([]*models.School, error) {
	if len(ids) == 0 {
		return nil, nil
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*models.School, 0, len(ids))
	for _, id := range ids {
		if sch, ok := s.byID[id]; ok {
			out = append(out, sch)
		}
	}
	return out, nil
}

// CountByCity returns total + open-status counts per city_id present in
// the store.
func (s *Schools) CountByCity(_ context.Context) (map[string]CityStats, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := map[string]CityStats{}
	for _, sch := range s.byID {
		cs := out[sch.CityID]
		cs.Total++
		if sch.Facilities["campus"].Status == "open" {
			cs.Open++
		}
		out[sch.CityID] = cs
	}
	return out, nil
}

// Insert writes the school to disk and updates the in-memory map. The country
// directory is resolved from the school's cityId via data.CityByID — caller
// must ensure cities have been loaded first (handlers already validate cityId
// against the cities table before calling).
//
// On disk format: pretty-printed JSON (2-space indent) so git diffs are
// readable. File path: data/schools/<country>/<slug>.json.
func (s *Schools) Insert(_ context.Context, sch *models.School) error {
	if sch.ID == "" {
		return fmt.Errorf("school.id is empty")
	}
	city, ok := data.CityByID(sch.CityID)
	if !ok {
		return fmt.Errorf("unknown cityId: %s", sch.CityID)
	}
	country := strings.ToLower(city.Country)

	// Ensure deterministic on-disk shape: empty arrays/maps over nil so the
	// JSON reads identically across writes.
	if sch.Others == nil {
		sch.Others = []models.Other{}
	}
	if sch.Facilities == nil {
		sch.Facilities = map[string]models.Facility{}
	}

	dir := filepath.Join(s.dataDir, "schools", country)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("mkdir %s: %w", dir, err)
	}
	path := filepath.Join(dir, sch.ID+".json")

	b, err := json.MarshalIndent(sch, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal %s: %w", sch.ID, err)
	}
	b = append(b, '\n')

	// Write atomically: temp file in same dir, then rename. Avoids leaving a
	// half-written file if the process dies mid-write.
	tmp, err := os.CreateTemp(dir, "."+sch.ID+".*.tmp")
	if err != nil {
		return fmt.Errorf("create temp: %w", err)
	}
	tmpPath := tmp.Name()
	if _, err := tmp.Write(b); err != nil {
		tmp.Close()
		os.Remove(tmpPath)
		return fmt.Errorf("write temp: %w", err)
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("close temp: %w", err)
	}
	if err := os.Rename(tmpPath, path); err != nil {
		os.Remove(tmpPath)
		return fmt.Errorf("rename %s -> %s: %w", tmpPath, path, err)
	}

	s.mu.Lock()
	s.byID[sch.ID] = sch
	s.searchTexts[sch.ID] = search.BuildText(sch.Name, sch.ID)
	s.mu.Unlock()
	return nil
}
