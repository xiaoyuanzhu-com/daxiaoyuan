# 大大校园 Backend Scaffold — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the scope A read-only backend per [`docs/superpowers/specs/2026-05-12-backend-design.md`](../specs/2026-05-12-backend-design.md): Go + Gin + SQLite, 4 GET endpoints, seed import tool, 10 北京 schools imported as initial data.

**Architecture:** Layered Go service — `models` (structs) → `repo` (DB access) → `handlers` (HTTP) → `server` (router + middleware) → `cmd/server` (main). Static cities config in `internal/data/cities.json` loaded at startup. SQLite migrated via embedded goose. Tests use in-memory SQLite + httptest.

**Tech Stack:** Go 1.22+ / Gin / modernc.org/sqlite (pure Go) / pressly/goose v3 / testify

**Module path:** `github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend`

**Working directory:** All `go` / `make` commands run from `backend/` unless noted.

---

## Task 1: Bootstrap project skeleton

**Files:**
- Create: `backend/go.mod`
- Create: `backend/.gitignore`
- Create: `backend/Makefile`
- Create: `backend/README.md`

- [ ] **Step 1: Create backend directory and `go.mod`**

```bash
mkdir -p backend && cd backend
go mod init github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend
```

Expected: `go.mod` created with module declaration and `go 1.22` line.

- [ ] **Step 2: Add dependencies**

```bash
cd backend
go get github.com/gin-gonic/gin@latest
go get modernc.org/sqlite@latest
go get github.com/pressly/goose/v3@latest
go get github.com/stretchr/testify@latest
```

Expected: `go.sum` created, `go.mod` has 4 `require` lines.

- [ ] **Step 3: Write `.gitignore`**

```
# Build artifacts
/ddxy
/bin/

# SQLite files
*.db
*.db-journal
*.db-wal
*.db-shm

# Editor
.vscode/
.idea/

# Test coverage
*.out
coverage.html
```

- [ ] **Step 4: Write `Makefile`**

```makefile
.PHONY: build run test seed clean fmt vet

build:
	go build -o bin/ddxy ./cmd/server

run:
	go run ./cmd/server

test:
	go test ./...

test-v:
	go test -v ./...

seed:
	go run ./seed

fmt:
	go fmt ./...

vet:
	go vet ./...

clean:
	rm -rf bin/ ddxy *.db
```

- [ ] **Step 5: Write `README.md`**

````markdown
# 大大校园 Backend

Go + Gin + SQLite. Serves the read-only `/api/v1/` endpoints described in
[`../docs/superpowers/specs/2026-05-12-backend-design.md`](../docs/superpowers/specs/2026-05-12-backend-design.md).

## Quick start

```bash
make seed          # populate ddxy.db with the 10 Beijing schools
make run           # start server on :8080
curl localhost:8080/api/v1/cities
```

## Tests

```bash
make test
```

## Env vars

| Var | Default | |
|---|---|---|
| `DDXY_ADDR` | `:8080` | HTTP listen address |
| `DDXY_DB_PATH` | `./ddxy.db` | SQLite file path |
| `DDXY_LOG_LEVEL` | `info` | log level (debug/info/warn/error) |
````

- [ ] **Step 6: Verify project compiles (empty package)**

```bash
cd backend
mkdir -p cmd/server
cat > cmd/server/main.go <<'EOF'
package main

func main() {}
EOF
go build ./...
```

Expected: builds with no errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add backend/
git commit -m "chore(backend): scaffold go module + makefile + gitignore"
```

---

## Task 2: Config package

**Files:**
- Create: `backend/internal/config/config.go`
- Create: `backend/internal/config/config_test.go`

- [ ] **Step 1: Write the failing test**

`backend/internal/config/config_test.go`:

```go
package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLoad_Defaults(t *testing.T) {
	t.Setenv("DDXY_ADDR", "")
	t.Setenv("DDXY_DB_PATH", "")
	t.Setenv("DDXY_LOG_LEVEL", "")

	cfg := Load()

	assert.Equal(t, ":8080", cfg.Addr)
	assert.Equal(t, "./ddxy.db", cfg.DBPath)
	assert.Equal(t, "info", cfg.LogLevel)
}

func TestLoad_FromEnv(t *testing.T) {
	t.Setenv("DDXY_ADDR", ":9090")
	t.Setenv("DDXY_DB_PATH", "/tmp/test.db")
	t.Setenv("DDXY_LOG_LEVEL", "debug")

	cfg := Load()

	assert.Equal(t, ":9090", cfg.Addr)
	assert.Equal(t, "/tmp/test.db", cfg.DBPath)
	assert.Equal(t, "debug", cfg.LogLevel)
}
```

- [ ] **Step 2: Run test, verify it fails**

```bash
cd backend
go test ./internal/config/
```

Expected: FAIL with "no Go files" or "Load undefined".

- [ ] **Step 3: Write `config.go`**

`backend/internal/config/config.go`:

```go
package config

import "os"

type Config struct {
	Addr     string
	DBPath   string
	LogLevel string
}

func Load() Config {
	return Config{
		Addr:     envOr("DDXY_ADDR", ":8080"),
		DBPath:   envOr("DDXY_DB_PATH", "./ddxy.db"),
		LogLevel: envOr("DDXY_LOG_LEVEL", "info"),
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
cd backend
go test ./internal/config/
```

Expected: `ok  github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/config`

- [ ] **Step 5: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add backend/internal/config/
git commit -m "feat(backend): config package with env var loading"
```

---

## Task 3: Cities static config loader

**Files:**
- Create: `backend/internal/data/cities.json`
- Create: `backend/internal/data/cities.go`
- Create: `backend/internal/data/cities_test.go`

- [ ] **Step 1: Write `cities.json` (full 8-city seed from spec)**

`backend/internal/data/cities.json`:

```json
[
  { "id": "bj", "name": "北京", "country": "CN", "code": "110100", "lat": 39.96, "lng": 116.34, "active": true  },
  { "id": "sh", "name": "上海", "country": "CN", "code": "310100", "lat": 31.23, "lng": 121.47, "active": false },
  { "id": "gz", "name": "广州", "country": "CN", "code": "440100", "lat": 23.13, "lng": 113.27, "active": false },
  { "id": "sz", "name": "深圳", "country": "CN", "code": "440300", "lat": 22.54, "lng": 114.06, "active": false },
  { "id": "nj", "name": "南京", "country": "CN", "code": "320100", "lat": 32.06, "lng": 118.79, "active": false },
  { "id": "hz", "name": "杭州", "country": "CN", "code": "330100", "lat": 30.27, "lng": 120.15, "active": false },
  { "id": "wh", "name": "武汉", "country": "CN", "code": "420100", "lat": 30.59, "lng": 114.30, "active": false },
  { "id": "cd", "name": "成都", "country": "CN", "code": "510100", "lat": 30.66, "lng": 104.06, "active": false }
]
```

- [ ] **Step 2: Write the failing test**

`backend/internal/data/cities_test.go`:

```go
package data

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCities_All(t *testing.T) {
	cs := Cities()
	require.Len(t, cs, 8)
	assert.Equal(t, "bj", cs[0].ID)
	assert.Equal(t, "北京", cs[0].Name)
	assert.True(t, cs[0].Active)
}

func TestCities_ByID(t *testing.T) {
	c, ok := CityByID("bj")
	require.True(t, ok)
	assert.Equal(t, "110100", c.Code)

	_, ok = CityByID("nope")
	assert.False(t, ok)
}

func TestCities_ByCode(t *testing.T) {
	c, ok := CityByCode("330100")
	require.True(t, ok)
	assert.Equal(t, "hz", c.ID)

	_, ok = CityByCode("999999")
	assert.False(t, ok)
}

func TestCities_OnlyBJActive(t *testing.T) {
	for _, c := range Cities() {
		if c.ID == "bj" {
			assert.True(t, c.Active)
		} else {
			assert.False(t, c.Active, "city %s should be inactive in MVP", c.ID)
		}
	}
}
```

- [ ] **Step 3: Run test, verify it fails**

```bash
cd backend
go test ./internal/data/
```

Expected: FAIL with "Cities undefined" / "no Go files".

- [ ] **Step 4: Write `cities.go`**

`backend/internal/data/cities.go`:

```go
package data

import (
	_ "embed"
	"encoding/json"
)

//go:embed cities.json
var citiesJSON []byte

type City struct {
	ID      string  `json:"id"`
	Name    string  `json:"name"`
	Country string  `json:"country"`
	Code    string  `json:"code"`
	Lat     float64 `json:"lat"`
	Lng     float64 `json:"lng"`
	Active  bool    `json:"active"`
}

var (
	cities   []City
	byID     map[string]City
	byCode   map[string]City
)

func init() {
	if err := json.Unmarshal(citiesJSON, &cities); err != nil {
		panic("failed to parse embedded cities.json: " + err.Error())
	}
	byID = make(map[string]City, len(cities))
	byCode = make(map[string]City, len(cities))
	for _, c := range cities {
		byID[c.ID] = c
		byCode[c.Code] = c
	}
}

// Cities returns the full city list in declaration order.
func Cities() []City {
	return cities
}

func CityByID(id string) (City, bool) {
	c, ok := byID[id]
	return c, ok
}

func CityByCode(code string) (City, bool) {
	c, ok := byCode[code]
	return c, ok
}
```

- [ ] **Step 5: Run test, verify it passes**

```bash
cd backend
go test ./internal/data/
```

Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add backend/internal/data/
git commit -m "feat(backend): static cities config loader with embedded JSON"
```

---

## Task 4: DB open + migration

**Files:**
- Create: `backend/internal/db/migrations/0001_init.sql`
- Create: `backend/internal/db/db.go`
- Create: `backend/internal/db/db_test.go`

- [ ] **Step 1: Write migration SQL**

`backend/internal/db/migrations/0001_init.sql`:

```sql
-- +goose Up
CREATE TABLE schools (
    id                    TEXT    PRIMARY KEY,
    city_id               TEXT    NOT NULL,
    name                  TEXT    NOT NULL,
    address               TEXT,
    lat                   REAL    NOT NULL,
    lng                   REAL    NOT NULL,
    status                TEXT    NOT NULL CHECK (status IN ('open', 'appt', 'alumni', 'closed')),
    reservation           TEXT,
    library_status        TEXT    NOT NULL CHECK (library_status IN ('open', 'appt', 'alumni', 'closed')),
    library_reservation   TEXT,
    track_status          TEXT    NOT NULL CHECK (track_status IN ('open', 'appt', 'alumni', 'closed')),
    track_reservation     TEXT,
    gym_status            TEXT    NOT NULL CHECK (gym_status IN ('open', 'appt', 'alumni', 'closed')),
    gym_reservation       TEXT,
    canteen_status        TEXT    NOT NULL CHECK (canteen_status IN ('open', 'appt', 'alumni', 'closed')),
    canteen_reservation   TEXT,
    others                TEXT,
    last_update           TIMESTAMP NOT NULL,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_schools_city ON schools(city_id);
CREATE INDEX idx_schools_status ON schools(status);

-- +goose Down
DROP INDEX IF EXISTS idx_schools_status;
DROP INDEX IF EXISTS idx_schools_city;
DROP TABLE IF EXISTS schools;
```

- [ ] **Step 2: Write the failing test**

`backend/internal/db/db_test.go`:

```go
package db

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestOpen_InMemory(t *testing.T) {
	d, err := Open(":memory:")
	require.NoError(t, err)
	defer d.Close()

	// Verify schools table exists.
	var name string
	err = d.QueryRow(`SELECT name FROM sqlite_master WHERE type='table' AND name='schools'`).Scan(&name)
	require.NoError(t, err)
	assert.Equal(t, "schools", name)
}

func TestOpen_RejectsBadStatus(t *testing.T) {
	d, err := Open(":memory:")
	require.NoError(t, err)
	defer d.Close()

	_, err = d.Exec(`INSERT INTO schools (id, city_id, name, lat, lng, status,
		library_status, track_status, gym_status, canteen_status, last_update)
		VALUES ('x', 'bj', 'X', 0, 0, 'bogus', 'open', 'open', 'open', 'open', CURRENT_TIMESTAMP)`)
	assert.Error(t, err, "should reject status outside enum")
}
```

- [ ] **Step 3: Run test, verify it fails**

```bash
cd backend
go test ./internal/db/
```

Expected: FAIL with "Open undefined" / "no Go files".

- [ ] **Step 4: Write `db.go`**

`backend/internal/db/db.go`:

```go
package db

import (
	"database/sql"
	"embed"
	"fmt"

	"github.com/pressly/goose/v3"
	_ "modernc.org/sqlite"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

// Open opens (or creates) the SQLite database at path and applies pending
// migrations. Pass ":memory:" for an in-memory database (used in tests).
func Open(path string) (*sql.DB, error) {
	d, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	// SQLite + modernc requires foreign_keys pragma per-connection; we don't
	// use FKs here yet, but enabling early is cheap and future-proof.
	if _, err := d.Exec(`PRAGMA foreign_keys = ON`); err != nil {
		d.Close()
		return nil, fmt.Errorf("enable foreign_keys: %w", err)
	}

	goose.SetBaseFS(migrationsFS)
	if err := goose.SetDialect("sqlite3"); err != nil {
		d.Close()
		return nil, fmt.Errorf("set dialect: %w", err)
	}
	if err := goose.Up(d, "migrations"); err != nil {
		d.Close()
		return nil, fmt.Errorf("run migrations: %w", err)
	}
	return d, nil
}
```

- [ ] **Step 5: Run test, verify it passes**

```bash
cd backend
go test ./internal/db/
```

Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add backend/internal/db/
git commit -m "feat(backend): sqlite open + goose migration with schools schema"
```

---

## Task 5: Domain models

**Files:**
- Create: `backend/internal/models/reservation.go`
- Create: `backend/internal/models/facility.go`
- Create: `backend/internal/models/school.go`
- Create: `backend/internal/models/city.go`
- Create: `backend/internal/models/school_test.go`

- [ ] **Step 1: Write the failing test**

`backend/internal/models/school_test.go`:

```go
package models

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSchool_JSON_MinimalShape(t *testing.T) {
	s := School{
		ID:         "pku",
		CityID:     "bj",
		Name:       "北京大学",
		Lat:        39.992,
		Lng:        116.305,
		Status:     "appt",
		Facilities: map[string]Facility{
			"library": {Status: "closed"},
			"track":   {Status: "closed"},
			"gym":     {Status: "closed"},
			"canteen": {Status: "closed"},
		},
		Others:     []Other{},
		LastUpdate: time.Date(2026, 5, 9, 8, 30, 0, 0, time.UTC),
	}
	b, err := json.Marshal(s)
	require.NoError(t, err)
	var got map[string]any
	require.NoError(t, json.Unmarshal(b, &got))

	assert.Equal(t, "pku", got["id"])
	assert.Equal(t, "bj", got["cityId"])
	assert.Equal(t, "北京大学", got["name"])
	assert.Equal(t, "appt", got["status"])
	assert.Equal(t, "2026-05-09T08:30:00Z", got["lastUpdate"])
	assert.Nil(t, got["reservation"])
	facs := got["facilities"].(map[string]any)
	assert.Len(t, facs, 4)
	assert.Equal(t, "closed", facs["library"].(map[string]any)["status"])
}

func TestSchool_JSON_WithReservation(t *testing.T) {
	s := School{
		ID:         "pku",
		CityID:     "bj",
		Name:       "北京大学",
		Lat:        39.992,
		Lng:        116.305,
		Status:     "appt",
		Reservation: &Reservation{
			QrcodeUrl: "https://example.com/qr.png",
			Hint:      "关注「参观北大」公众号",
			Link:      "https://visit.pku.edu.cn",
		},
		Facilities: map[string]Facility{
			"library": {Status: "closed"},
			"track":   {Status: "closed"},
			"gym":     {Status: "closed"},
			"canteen": {Status: "closed"},
		},
		Others:     []Other{},
		LastUpdate: time.Now().UTC(),
	}
	b, err := json.Marshal(s)
	require.NoError(t, err)
	var got map[string]any
	require.NoError(t, json.Unmarshal(b, &got))

	r := got["reservation"].(map[string]any)
	assert.Equal(t, "https://example.com/qr.png", r["qrcodeUrl"])
	assert.Equal(t, "https://visit.pku.edu.cn", r["link"])
}

func TestReservation_LinkOmittedWhenEmpty(t *testing.T) {
	r := Reservation{QrcodeUrl: "u", Hint: "h"}
	b, err := json.Marshal(r)
	require.NoError(t, err)
	assert.NotContains(t, string(b), `"link"`)
}
```

- [ ] **Step 2: Run test, verify it fails**

```bash
cd backend
go test ./internal/models/
```

Expected: FAIL with "School undefined" / "no Go files".

- [ ] **Step 3: Write `reservation.go`**

`backend/internal/models/reservation.go`:

```go
package models

type Reservation struct {
	QrcodeUrl string `json:"qrcodeUrl"`
	Hint      string `json:"hint"`
	Link      string `json:"link,omitempty"`
}
```

- [ ] **Step 4: Write `facility.go`**

`backend/internal/models/facility.go`:

```go
package models

type Facility struct {
	Status      string       `json:"status"`
	Reservation *Reservation `json:"reservation"`
}

type Other struct {
	Kind        string       `json:"kind"`
	Name        string       `json:"name"`
	Status      string       `json:"status"`
	Reservation *Reservation `json:"reservation,omitempty"`
}
```

- [ ] **Step 5: Write `school.go`**

`backend/internal/models/school.go`:

```go
package models

import "time"

// School is the full API detail shape returned by GET /api/v1/schools/:id.
type School struct {
	ID          string              `json:"id"`
	CityID      string              `json:"cityId"`
	Name        string              `json:"name"`
	Address     string              `json:"address,omitempty"`
	Lat         float64             `json:"lat"`
	Lng         float64             `json:"lng"`
	Status      string              `json:"status"`
	Reservation *Reservation        `json:"reservation"`
	Facilities  map[string]Facility `json:"facilities"`
	Others      []Other             `json:"others"`
	LastUpdate  time.Time           `json:"lastUpdate"`
}

// SchoolSummary is the lighter shape returned by GET /api/v1/schools (list).
type SchoolSummary struct {
	ID         string    `json:"id"`
	CityID     string    `json:"cityId"`
	Name       string    `json:"name"`
	Address    string    `json:"address,omitempty"`
	Lat        float64   `json:"lat"`
	Lng        float64   `json:"lng"`
	Status     string    `json:"status"`
	LastUpdate time.Time `json:"lastUpdate"`
}
```

- [ ] **Step 6: Write `city.go`**

`backend/internal/models/city.go`:

```go
package models

// CityWithStats is the API response shape for GET /api/v1/cities — the
// static fields from cities.json plus runtime aggregates from the schools
// table.
type CityWithStats struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Country  string  `json:"country"`
	Code     string  `json:"code"`
	Lat      float64 `json:"lat"`
	Lng      float64 `json:"lng"`
	Active   bool    `json:"active"`
	Schools  int     `json:"schools"`
	OpenRate float64 `json:"openRate"`
}
```

- [ ] **Step 7: Run test, verify it passes**

```bash
cd backend
go test ./internal/models/
```

Expected: PASS, 3 tests.

- [ ] **Step 8: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add backend/internal/models/
git commit -m "feat(backend): domain models for school, facility, reservation, city"
```

---

## Task 6: Schools repository

**Files:**
- Create: `backend/internal/repo/errors.go`
- Create: `backend/internal/repo/schools.go`
- Create: `backend/internal/repo/testhelpers_test.go`
- Create: `backend/internal/repo/schools_test.go`

- [ ] **Step 1: Write `errors.go`**

`backend/internal/repo/errors.go`:

```go
package repo

import "errors"

var ErrNotFound = errors.New("not found")
```

- [ ] **Step 2: Write the test helper**

`backend/internal/repo/testhelpers_test.go`:

```go
package repo

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/db"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/models"
)

func newTestDB(t *testing.T) *sql.DB {
	t.Helper()
	d, err := db.Open(":memory:")
	require.NoError(t, err)
	t.Cleanup(func() { d.Close() })
	return d
}

// insertTestSchool writes a minimal school row directly via SQL.
// Used to seed test data without going through Schools.Insert (which
// itself is under test). Uses nullStr from schools.go (same package).
func insertTestSchool(t *testing.T, d *sql.DB, s *models.School) {
	t.Helper()
	_, err := d.ExecContext(context.Background(), `
		INSERT INTO schools (id, city_id, name, address, lat, lng, status,
			library_status, track_status, gym_status, canteen_status, last_update)
		VALUES (?, ?, ?, ?, ?, ?, ?, 'closed', 'closed', 'closed', 'closed', ?)`,
		s.ID, s.CityID, s.Name, nullStr(s.Address), s.Lat, s.Lng, s.Status,
		s.LastUpdate.UTC(),
	)
	require.NoError(t, err)
}

func mustTime(s string) time.Time {
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		panic(err)
	}
	return t
}
```

- [ ] **Step 3: Write the failing repo test**

`backend/internal/repo/schools_test.go`:

```go
package repo

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/models"
)

func TestSchools_List_Empty(t *testing.T) {
	d := newTestDB(t)
	r := NewSchools(d)
	out, err := r.List(context.Background(), "")
	require.NoError(t, err)
	assert.Empty(t, out)
}

func TestSchools_List_AllAndByCity(t *testing.T) {
	d := newTestDB(t)
	insertTestSchool(t, d, &models.School{ID: "pku", CityID: "bj", Name: "北京大学", Lat: 39.99, Lng: 116.30, Status: "appt", LastUpdate: mustTime("2026-05-01T00:00:00Z")})
	insertTestSchool(t, d, &models.School{ID: "fudan", CityID: "sh", Name: "复旦大学", Lat: 31.30, Lng: 121.50, Status: "open", LastUpdate: mustTime("2026-05-02T00:00:00Z")})

	r := NewSchools(d)

	all, err := r.List(context.Background(), "")
	require.NoError(t, err)
	assert.Len(t, all, 2)

	bj, err := r.List(context.Background(), "bj")
	require.NoError(t, err)
	require.Len(t, bj, 1)
	assert.Equal(t, "pku", bj[0].ID)
	assert.Equal(t, "appt", bj[0].Status)

	miss, err := r.List(context.Background(), "nope")
	require.NoError(t, err)
	assert.Empty(t, miss)
}

func TestSchools_Get_NotFound(t *testing.T) {
	d := newTestDB(t)
	r := NewSchools(d)
	_, err := r.Get(context.Background(), "missing")
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestSchools_Get_FullShape(t *testing.T) {
	d := newTestDB(t)
	_, err := d.Exec(`INSERT INTO schools (id, city_id, name, address, lat, lng, status, reservation,
		library_status, library_reservation,
		track_status, track_reservation,
		gym_status, gym_reservation,
		canteen_status, canteen_reservation,
		others, last_update)
		VALUES ('pku','bj','北京大学','北京市海淀区颐和园路 5 号',39.992,116.305,'appt',
			'{"qrcodeUrl":"https://example.com/qr.png","hint":"关注「参观北大」","link":"https://visit.pku.edu.cn"}',
			'closed', NULL,
			'closed', NULL,
			'closed', NULL,
			'closed', NULL,
			'[{"kind":"swim","name":"游泳馆","status":"appt"}]',
			'2026-05-09T08:30:00Z')`)
	require.NoError(t, err)

	r := NewSchools(d)
	got, err := r.Get(context.Background(), "pku")
	require.NoError(t, err)

	assert.Equal(t, "pku", got.ID)
	assert.Equal(t, "bj", got.CityID)
	assert.Equal(t, "北京市海淀区颐和园路 5 号", got.Address)
	assert.Equal(t, "appt", got.Status)
	require.NotNil(t, got.Reservation)
	assert.Equal(t, "https://example.com/qr.png", got.Reservation.QrcodeUrl)
	assert.Equal(t, "https://visit.pku.edu.cn", got.Reservation.Link)

	assert.Len(t, got.Facilities, 4)
	assert.Equal(t, "closed", got.Facilities["library"].Status)
	assert.Nil(t, got.Facilities["library"].Reservation)

	require.Len(t, got.Others, 1)
	assert.Equal(t, "swim", got.Others[0].Kind)
	assert.Equal(t, "游泳馆", got.Others[0].Name)
}

func TestSchools_Insert_RoundTrip(t *testing.T) {
	d := newTestDB(t)
	r := NewSchools(d)

	in := &models.School{
		ID: "tsinghua", CityID: "bj", Name: "清华大学", Lat: 40.0, Lng: 116.326, Status: "appt",
		Reservation: &models.Reservation{QrcodeUrl: "https://x.png", Hint: "h"},
		Facilities: map[string]models.Facility{
			"library": {Status: "closed"},
			"track":   {Status: "closed"},
			"gym":     {Status: "closed"},
			"canteen": {Status: "closed"},
		},
		Others:     []models.Other{},
		LastUpdate: mustTime("2026-05-09T00:00:00Z"),
	}
	require.NoError(t, r.Insert(context.Background(), in))

	got, err := r.Get(context.Background(), "tsinghua")
	require.NoError(t, err)
	assert.Equal(t, "清华大学", got.Name)
	require.NotNil(t, got.Reservation)
	assert.Equal(t, "https://x.png", got.Reservation.QrcodeUrl)
}

func TestSchools_CountByCity(t *testing.T) {
	d := newTestDB(t)
	insertTestSchool(t, d, &models.School{ID: "a", CityID: "bj", Name: "A", Status: "open",   LastUpdate: mustTime("2026-05-01T00:00:00Z")})
	insertTestSchool(t, d, &models.School{ID: "b", CityID: "bj", Name: "B", Status: "open",   LastUpdate: mustTime("2026-05-01T00:00:00Z")})
	insertTestSchool(t, d, &models.School{ID: "c", CityID: "bj", Name: "C", Status: "appt",   LastUpdate: mustTime("2026-05-01T00:00:00Z")})
	insertTestSchool(t, d, &models.School{ID: "d", CityID: "bj", Name: "D", Status: "closed", LastUpdate: mustTime("2026-05-01T00:00:00Z")})

	r := NewSchools(d)
	stats, err := r.CountByCity(context.Background())
	require.NoError(t, err)
	assert.Equal(t, 4, stats["bj"].Total)
	assert.Equal(t, 2, stats["bj"].Open)
}
```

- [ ] **Step 4: Run test, verify it fails**

```bash
cd backend
go test ./internal/repo/
```

Expected: FAIL — `NewSchools`, `Insert`, etc. undefined.

- [ ] **Step 5: Write `schools.go`**

`backend/internal/repo/schools.go`:

```go
package repo

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/models"
)

type Schools struct {
	db *sql.DB
}

func NewSchools(db *sql.DB) *Schools {
	return &Schools{db: db}
}

// CityStats holds aggregate counts for one city.
type CityStats struct {
	Total int
	Open  int // schools where status='open'
}

const summaryCols = `id, city_id, name, address, lat, lng, status, last_update`

func (s *Schools) List(ctx context.Context, cityID string) ([]models.SchoolSummary, error) {
	q := `SELECT ` + summaryCols + ` FROM schools`
	args := []any{}
	if cityID != "" {
		q += ` WHERE city_id = ?`
		args = append(args, cityID)
	}
	q += ` ORDER BY id`
	rows, err := s.db.QueryContext(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("query schools: %w", err)
	}
	defer rows.Close()
	out := []models.SchoolSummary{}
	for rows.Next() {
		sch, err := scanSummary(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, sch)
	}
	return out, rows.Err()
}

func scanSummary(rows *sql.Rows) (models.SchoolSummary, error) {
	var sch models.SchoolSummary
	var addr sql.NullString
	if err := rows.Scan(&sch.ID, &sch.CityID, &sch.Name, &addr, &sch.Lat, &sch.Lng, &sch.Status, &sch.LastUpdate); err != nil {
		return sch, err
	}
	if addr.Valid {
		sch.Address = addr.String
	}
	return sch, nil
}

const detailCols = `
	id, city_id, name, address, lat, lng, status, reservation,
	library_status, library_reservation,
	track_status, track_reservation,
	gym_status, gym_reservation,
	canteen_status, canteen_reservation,
	others, last_update`

func (s *Schools) Get(ctx context.Context, id string) (*models.School, error) {
	row := s.db.QueryRowContext(ctx, `SELECT `+detailCols+` FROM schools WHERE id = ?`, id)
	sch, err := scanDetail(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return sch, nil
}

// ListAllDetail returns every school in full detail form (used by dump endpoint).
func (s *Schools) ListAllDetail(ctx context.Context) ([]*models.School, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT `+detailCols+` FROM schools ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*models.School{}
	for rows.Next() {
		sch, err := scanDetail(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, sch)
	}
	return out, rows.Err()
}

// scanner is satisfied by both *sql.Row and *sql.Rows.
type scanner interface {
	Scan(dest ...any) error
}

func scanDetail(sc scanner) (*models.School, error) {
	var sch models.School
	var addr, resv, libRes, trkRes, gymRes, canRes, others sql.NullString
	var libStat, trkStat, gymStat, canStat string

	if err := sc.Scan(
		&sch.ID, &sch.CityID, &sch.Name, &addr, &sch.Lat, &sch.Lng, &sch.Status, &resv,
		&libStat, &libRes,
		&trkStat, &trkRes,
		&gymStat, &gymRes,
		&canStat, &canRes,
		&others, &sch.LastUpdate,
	); err != nil {
		return nil, err
	}
	if addr.Valid {
		sch.Address = addr.String
	}
	if resv.Valid {
		var r models.Reservation
		if err := json.Unmarshal([]byte(resv.String), &r); err != nil {
			return nil, fmt.Errorf("decode school.reservation: %w", err)
		}
		sch.Reservation = &r
	}
	sch.Facilities = map[string]models.Facility{
		"library": mustFacility(libStat, libRes),
		"track":   mustFacility(trkStat, trkRes),
		"gym":     mustFacility(gymStat, gymRes),
		"canteen": mustFacility(canStat, canRes),
	}
	sch.Others = []models.Other{}
	if others.Valid {
		if err := json.Unmarshal([]byte(others.String), &sch.Others); err != nil {
			return nil, fmt.Errorf("decode school.others: %w", err)
		}
	}
	return &sch, nil
}

func mustFacility(status string, resv sql.NullString) models.Facility {
	f := models.Facility{Status: status}
	if resv.Valid {
		var r models.Reservation
		if err := json.Unmarshal([]byte(resv.String), &r); err == nil {
			f.Reservation = &r
		}
	}
	return f
}

func (s *Schools) Insert(ctx context.Context, sch *models.School) error {
	resvJSON, err := marshalNull(sch.Reservation)
	if err != nil {
		return err
	}
	libRes, err := marshalNull(sch.Facilities["library"].Reservation)
	if err != nil {
		return err
	}
	trkRes, err := marshalNull(sch.Facilities["track"].Reservation)
	if err != nil {
		return err
	}
	gymRes, err := marshalNull(sch.Facilities["gym"].Reservation)
	if err != nil {
		return err
	}
	canRes, err := marshalNull(sch.Facilities["canteen"].Reservation)
	if err != nil {
		return err
	}
	var othersJSON sql.NullString
	if len(sch.Others) > 0 {
		b, err := json.Marshal(sch.Others)
		if err != nil {
			return err
		}
		othersJSON = sql.NullString{String: string(b), Valid: true}
	}

	_, err = s.db.ExecContext(ctx, `
		INSERT INTO schools (
			id, city_id, name, address, lat, lng, status, reservation,
			library_status, library_reservation,
			track_status, track_reservation,
			gym_status, gym_reservation,
			canteen_status, canteen_reservation,
			others, last_update
		) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		sch.ID, sch.CityID, sch.Name, nullStr(sch.Address), sch.Lat, sch.Lng, sch.Status, resvJSON,
		sch.Facilities["library"].Status, libRes,
		sch.Facilities["track"].Status, trkRes,
		sch.Facilities["gym"].Status, gymRes,
		sch.Facilities["canteen"].Status, canRes,
		othersJSON, sch.LastUpdate.UTC(),
	)
	return err
}

func marshalNull(r *models.Reservation) (sql.NullString, error) {
	if r == nil {
		return sql.NullString{}, nil
	}
	b, err := json.Marshal(r)
	if err != nil {
		return sql.NullString{}, err
	}
	return sql.NullString{String: string(b), Valid: true}, nil
}

func nullStr(v string) sql.NullString {
	if v == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: v, Valid: true}
}

// CountByCity returns total + open-status counts per city_id present in
// the schools table.
func (s *Schools) CountByCity(ctx context.Context) (map[string]CityStats, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT city_id,
		       COUNT(*) AS total,
		       SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open
		FROM schools
		GROUP BY city_id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]CityStats{}
	for rows.Next() {
		var cid string
		var total, openN int
		if err := rows.Scan(&cid, &total, &openN); err != nil {
			return nil, err
		}
		out[cid] = CityStats{Total: total, Open: openN}
	}
	return out, rows.Err()
}
```

- [ ] **Step 6: Run test, verify it passes**

```bash
cd backend
go test ./internal/repo/
```

Expected: PASS, 6 tests.

- [ ] **Step 7: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add backend/internal/repo/
git commit -m "feat(backend): schools repository (list, get, insert, count-by-city)"
```

---

## Task 7: HTTP error helper

**Files:**
- Create: `backend/internal/handlers/errors.go`

- [ ] **Step 1: Write `errors.go`**

`backend/internal/handlers/errors.go`:

```go
package handlers

import "github.com/gin-gonic/gin"

func writeError(c *gin.Context, status int, msg string) {
	c.JSON(status, gin.H{"error": msg})
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd backend
go build ./internal/handlers/
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add backend/internal/handlers/errors.go
git commit -m "feat(backend): handlers error helper"
```

---

## Task 8: Cities handler

**Files:**
- Create: `backend/internal/handlers/cities.go`
- Create: `backend/internal/handlers/cities_test.go`

- [ ] **Step 1: Write the failing test**

`backend/internal/handlers/cities_test.go`:

```go
package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/db"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/repo"
)

func TestGETCities_EmptyDB(t *testing.T) {
	gin.SetMode(gin.TestMode)
	d, err := db.Open(":memory:")
	require.NoError(t, err)
	defer d.Close()

	r := gin.New()
	r.GET("/api/v1/cities", Cities(repo.NewSchools(d)))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/cities", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var body struct {
		Cities []map[string]any `json:"cities"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Len(t, body.Cities, 8, "should return all 8 cities from cities.json")

	// bj is first and has zero schools when DB is empty.
	bj := body.Cities[0]
	assert.Equal(t, "bj", bj["id"])
	assert.Equal(t, "北京", bj["name"])
	assert.Equal(t, float64(0), bj["schools"])
	assert.Equal(t, float64(0), bj["openRate"])
}

func TestGETCities_WithStats(t *testing.T) {
	gin.SetMode(gin.TestMode)
	d, err := db.Open(":memory:")
	require.NoError(t, err)
	defer d.Close()

	// Insert 2 open schools + 1 appt school in bj.
	_, err = d.Exec(`INSERT INTO schools (id, city_id, name, lat, lng, status,
		library_status, track_status, gym_status, canteen_status, last_update)
		VALUES
		('a','bj','A',0,0,'open','closed','closed','closed','closed', CURRENT_TIMESTAMP),
		('b','bj','B',0,0,'open','closed','closed','closed','closed', CURRENT_TIMESTAMP),
		('c','bj','C',0,0,'appt','closed','closed','closed','closed', CURRENT_TIMESTAMP)`)
	require.NoError(t, err)

	r := gin.New()
	r.GET("/api/v1/cities", Cities(repo.NewSchools(d)))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/cities", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var body struct {
		Cities []map[string]any `json:"cities"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))

	var bj map[string]any
	for _, c := range body.Cities {
		if c["id"] == "bj" {
			bj = c
		}
	}
	require.NotNil(t, bj)
	assert.Equal(t, float64(3), bj["schools"])
	assert.InDelta(t, 2.0/3.0, bj["openRate"], 0.001)
}
```

- [ ] **Step 2: Run test, verify it fails**

```bash
cd backend
go test ./internal/handlers/ -run TestGETCities
```

Expected: FAIL — `Cities` undefined.

- [ ] **Step 3: Write `cities.go`**

`backend/internal/handlers/cities.go`:

```go
package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/data"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/models"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/repo"
)

func Cities(schools *repo.Schools) gin.HandlerFunc {
	return func(c *gin.Context) {
		stats, err := schools.CountByCity(c.Request.Context())
		if err != nil {
			writeError(c, http.StatusInternalServerError, err.Error())
			return
		}

		all := data.Cities()
		out := make([]models.CityWithStats, 0, len(all))
		for _, city := range all {
			s := stats[city.ID]
			rate := 0.0
			if s.Total > 0 {
				rate = float64(s.Open) / float64(s.Total)
			}
			out = append(out, models.CityWithStats{
				ID: city.ID, Name: city.Name, Country: city.Country,
				Code: city.Code, Lat: city.Lat, Lng: city.Lng, Active: city.Active,
				Schools:  s.Total,
				OpenRate: rate,
			})
		}
		c.JSON(http.StatusOK, gin.H{"cities": out})
	}
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
cd backend
go test ./internal/handlers/ -run TestGETCities
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add backend/internal/handlers/
git commit -m "feat(backend): GET /api/v1/cities with per-city aggregates"
```

---

## Task 9: Schools list + detail handlers

**Files:**
- Create: `backend/internal/handlers/schools.go`
- Create: `backend/internal/handlers/schools_test.go`

- [ ] **Step 1: Write the failing tests**

`backend/internal/handlers/schools_test.go`:

```go
package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/db"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/repo"
)

func seedTwoSchools(t *testing.T) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	d, err := db.Open(":memory:")
	require.NoError(t, err)
	t.Cleanup(func() { d.Close() })

	_, err = d.Exec(`INSERT INTO schools (id, city_id, name, address, lat, lng, status, reservation,
		library_status, library_reservation,
		track_status, track_reservation,
		gym_status, gym_reservation,
		canteen_status, canteen_reservation,
		others, last_update)
		VALUES
		('pku','bj','北京大学','北京市海淀区颐和园路 5 号',39.992,116.305,'appt',
		 '{"qrcodeUrl":"https://x/qr.png","hint":"h","link":"https://visit.pku.edu.cn"}',
		 'closed', NULL,
		 'closed', NULL,
		 'closed', NULL,
		 'closed', NULL,
		 NULL,
		 '2026-05-09T08:30:00Z'),
		('fudan','sh','复旦大学',NULL,31.30,121.50,'open',NULL,
		 'open', NULL,
		 'open', NULL,
		 'open', NULL,
		 'open', NULL,
		 NULL,
		 '2026-05-09T00:00:00Z')`)
	require.NoError(t, err)

	r := gin.New()
	repoS := repo.NewSchools(d)
	r.GET("/api/v1/schools", SchoolsList(repoS))
	r.GET("/api/v1/schools/:id", SchoolDetail(repoS))
	return r
}

func TestGETSchools_List_All(t *testing.T) {
	r := seedTwoSchools(t)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/schools", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var body struct {
		Schools []map[string]any `json:"schools"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Len(t, body.Schools, 2)
	assert.Equal(t, "fudan", body.Schools[0]["id"]) // alphabetical order
	assert.Equal(t, "pku", body.Schools[1]["id"])
	// Summary shape MUST NOT include facilities / reservation / others.
	assert.NotContains(t, body.Schools[1], "facilities")
	assert.NotContains(t, body.Schools[1], "reservation")
}

func TestGETSchools_List_FilterByCity(t *testing.T) {
	r := seedTwoSchools(t)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/schools?city=bj", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var body struct {
		Schools []map[string]any `json:"schools"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	require.Len(t, body.Schools, 1)
	assert.Equal(t, "pku", body.Schools[0]["id"])
}

func TestGETSchool_Detail_OK(t *testing.T) {
	r := seedTwoSchools(t)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/schools/pku", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var body struct {
		School map[string]any `json:"school"`
	}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	s := body.School
	assert.Equal(t, "pku", s["id"])
	assert.Equal(t, "appt", s["status"])
	r2 := s["reservation"].(map[string]any)
	assert.Equal(t, "https://x/qr.png", r2["qrcodeUrl"])
	facs := s["facilities"].(map[string]any)
	assert.Len(t, facs, 4)
}

func TestGETSchool_Detail_NotFound(t *testing.T) {
	r := seedTwoSchools(t)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/schools/missing", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusNotFound, w.Code)
	var body map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))
	assert.Equal(t, "school not found", body["error"])
}
```

- [ ] **Step 2: Run test, verify it fails**

```bash
cd backend
go test ./internal/handlers/ -run TestGETSchool
```

Expected: FAIL — `SchoolsList` / `SchoolDetail` undefined.

- [ ] **Step 3: Write `schools.go`**

`backend/internal/handlers/schools.go`:

```go
package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/repo"
)

func SchoolsList(schools *repo.Schools) gin.HandlerFunc {
	return func(c *gin.Context) {
		city := c.Query("city")
		out, err := schools.List(c.Request.Context(), city)
		if err != nil {
			writeError(c, http.StatusInternalServerError, err.Error())
			return
		}
		c.JSON(http.StatusOK, gin.H{"schools": out})
	}
}

func SchoolDetail(schools *repo.Schools) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		out, err := schools.Get(c.Request.Context(), id)
		if err != nil {
			if errors.Is(err, repo.ErrNotFound) {
				writeError(c, http.StatusNotFound, "school not found")
				return
			}
			writeError(c, http.StatusInternalServerError, err.Error())
			return
		}
		c.JSON(http.StatusOK, gin.H{"school": out})
	}
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
cd backend
go test ./internal/handlers/ -run TestGETSchool
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add backend/internal/handlers/schools.go backend/internal/handlers/schools_test.go
git commit -m "feat(backend): GET /api/v1/schools list + detail handlers"
```

---

## Task 10: Dump handler

**Files:**
- Create: `backend/internal/handlers/dump.go`
- Create: `backend/internal/handlers/dump_test.go`

- [ ] **Step 1: Write the failing test**

`backend/internal/handlers/dump_test.go`:

```go
package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/db"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/repo"
)

func TestGETDump_Shape(t *testing.T) {
	gin.SetMode(gin.TestMode)
	d, err := db.Open(":memory:")
	require.NoError(t, err)
	defer d.Close()

	_, err = d.Exec(`INSERT INTO schools (id, city_id, name, lat, lng, status,
		library_status, track_status, gym_status, canteen_status, last_update)
		VALUES ('pku','bj','北京大学',0,0,'appt','closed','closed','closed','closed','2026-05-09T00:00:00Z')`)
	require.NoError(t, err)

	r := gin.New()
	r.GET("/api/v1/dump.json", Dump(repo.NewSchools(d)))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/dump.json", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)
	var body map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &body))

	assert.NotEmpty(t, body["generatedAt"])
	cities := body["cities"].([]any)
	assert.Len(t, cities, 8)
	schools := body["schools"].([]any)
	require.Len(t, schools, 1)
	pku := schools[0].(map[string]any)
	assert.Equal(t, "pku", pku["id"])
	assert.Contains(t, pku, "facilities") // full detail shape
}
```

- [ ] **Step 2: Run test, verify it fails**

```bash
cd backend
go test ./internal/handlers/ -run TestGETDump
```

Expected: FAIL — `Dump` undefined.

- [ ] **Step 3: Write `dump.go`**

`backend/internal/handlers/dump.go`:

```go
package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/data"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/models"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/repo"
)

func Dump(schools *repo.Schools) gin.HandlerFunc {
	return func(c *gin.Context) {
		stats, err := schools.CountByCity(c.Request.Context())
		if err != nil {
			writeError(c, http.StatusInternalServerError, err.Error())
			return
		}
		all, err := schools.ListAllDetail(c.Request.Context())
		if err != nil {
			writeError(c, http.StatusInternalServerError, err.Error())
			return
		}

		// Cities with aggregates (same shape as /api/v1/cities response).
		cs := data.Cities()
		cities := make([]models.CityWithStats, 0, len(cs))
		for _, city := range cs {
			s := stats[city.ID]
			rate := 0.0
			if s.Total > 0 {
				rate = float64(s.Open) / float64(s.Total)
			}
			cities = append(cities, models.CityWithStats{
				ID: city.ID, Name: city.Name, Country: city.Country,
				Code: city.Code, Lat: city.Lat, Lng: city.Lng, Active: city.Active,
				Schools:  s.Total,
				OpenRate: rate,
			})
		}

		c.JSON(http.StatusOK, gin.H{
			"generatedAt": time.Now().UTC().Format(time.RFC3339),
			"cities":      cities,
			"schools":     all,
		})
	}
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
cd backend
go test ./internal/handlers/ -run TestGETDump
```

Expected: PASS.

- [ ] **Step 5: Run all handler tests**

```bash
cd backend
go test ./internal/handlers/
```

Expected: PASS, 7 tests total.

- [ ] **Step 6: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add backend/internal/handlers/dump.go backend/internal/handlers/dump_test.go
git commit -m "feat(backend): GET /api/v1/dump.json full database export"
```

---

## Task 11: Router + middleware

**Files:**
- Create: `backend/internal/server/middleware.go`
- Create: `backend/internal/server/router.go`
- Create: `backend/internal/server/router_test.go`

- [ ] **Step 1: Write `middleware.go`**

`backend/internal/server/middleware.go`:

```go
package server

import "github.com/gin-gonic/gin"

// cors writes permissive CORS headers. The PRD §透明 commitment is that any
// origin can call GET endpoints freely; this is a public read-only API.
func cors() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}
```

- [ ] **Step 2: Write `router.go`**

`backend/internal/server/router.go`:

```go
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
	v1.GET("/schools/:id", handlers.SchoolDetail(schools))
	v1.GET("/dump.json", handlers.Dump(schools))

	r.GET("/healthz", func(c *gin.Context) {
		c.String(200, "ok")
	})

	return r
}
```

- [ ] **Step 3: Write a smoke test that the router wires correctly**

`backend/internal/server/router_test.go`:

```go
package server

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/db"
)

func TestRouter_Healthz(t *testing.T) {
	gin.SetMode(gin.TestMode)
	d, err := db.Open(":memory:")
	require.NoError(t, err)
	defer d.Close()

	r := NewRouter(d)
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, 200, w.Code)
	assert.Equal(t, "ok", w.Body.String())
}

func TestRouter_AllAPIRoutesRegistered(t *testing.T) {
	gin.SetMode(gin.TestMode)
	d, err := db.Open(":memory:")
	require.NoError(t, err)
	defer d.Close()

	r := NewRouter(d)
	routes := r.Routes()

	wantPaths := map[string]bool{
		"GET /api/v1/cities":      false,
		"GET /api/v1/schools":     false,
		"GET /api/v1/schools/:id": false,
		"GET /api/v1/dump.json":   false,
	}
	for _, ri := range routes {
		key := ri.Method + " " + ri.Path
		if _, ok := wantPaths[key]; ok {
			wantPaths[key] = true
		}
	}
	for path, found := range wantPaths {
		assert.True(t, found, "expected route %s to be registered", path)
	}
}

func TestRouter_CORSHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)
	d, err := db.Open(":memory:")
	require.NoError(t, err)
	defer d.Close()

	r := NewRouter(d)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/cities", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	assert.Equal(t, "*", w.Header().Get("Access-Control-Allow-Origin"))
}
```

- [ ] **Step 4: Run server tests**

```bash
cd backend
go test ./internal/server/
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add backend/internal/server/
git commit -m "feat(backend): gin router with CORS, healthz, and v1 endpoints"
```

---

## Task 12: Server entry point

**Files:**
- Modify: `backend/cmd/server/main.go`

- [ ] **Step 1: Replace stub `main.go`**

`backend/cmd/server/main.go`:

```go
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
```

- [ ] **Step 2: Build the binary**

```bash
cd backend
make build
```

Expected: `bin/ddxy` created with no errors.

- [ ] **Step 3: Run smoke test**

```bash
cd backend
./bin/ddxy &
SERVER_PID=$!
sleep 1
curl -s localhost:8080/healthz
curl -s localhost:8080/api/v1/cities | head -c 200
kill $SERVER_PID
rm -f ddxy.db
```

Expected: `healthz` returns `ok`; `/api/v1/cities` returns a JSON with 8 cities and zero school counts.

- [ ] **Step 4: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add backend/cmd/server/main.go
git commit -m "feat(backend): main entry — load config, open db, run server"
```

---

## Task 13: Seed data — schools.json

**Files:**
- Create: `backend/seed/schools.json`

- [ ] **Step 1: Write `schools.json`**

This is the structured transcription of the 10 Beijing schools from `wechat/utils/data.js`, with the field transformations per the spec's seed table. **Status `daytime` is reclassified to `open`**; `id: thu` → `tsinghua`; `id: minzu` → `muc`.

`backend/seed/schools.json`:

```json
[
  {
    "id": "pku",
    "cityId": "bj",
    "name": "北京大学",
    "lat": 39.992,
    "lng": 116.305,
    "status": "appt",
    "reservation": {
      "qrcodeUrl": "https://placehold.co/600x600/png?text=QR",
      "hint": "关注「参观北大」公众号 → 菜单「个人预约」",
      "link": "https://visit.pku.edu.cn"
    },
    "facilities": {
      "library": { "status": "closed" },
      "track":   { "status": "closed" },
      "gym":     { "status": "closed" },
      "canteen": { "status": "closed" }
    },
    "others": [],
    "lastUpdate": "2026-05-09T00:00:00Z"
  },
  {
    "id": "tsinghua",
    "cityId": "bj",
    "name": "清华大学",
    "lat": 40.000,
    "lng": 116.326,
    "status": "appt",
    "reservation": {
      "qrcodeUrl": "https://placehold.co/600x600/png?text=QR",
      "hint": "识别小程序码进入「清华大学参观预约」"
    },
    "facilities": {
      "library": { "status": "closed" },
      "track":   { "status": "closed" },
      "gym":     { "status": "closed" },
      "canteen": { "status": "closed" }
    },
    "others": [],
    "lastUpdate": "2026-05-11T00:00:00Z"
  },
  {
    "id": "ruc",
    "cityId": "bj",
    "name": "中国人民大学",
    "lat": 39.969,
    "lng": 116.319,
    "status": "open",
    "facilities": {
      "library": { "status": "closed" },
      "track":   { "status": "open" },
      "gym":     { "status": "closed" },
      "canteen": { "status": "open" }
    },
    "others": [],
    "lastUpdate": "2026-05-12T00:00:00Z"
  },
  {
    "id": "bnu",
    "cityId": "bj",
    "name": "北京师范大学",
    "lat": 39.962,
    "lng": 116.366,
    "status": "open",
    "facilities": {
      "library": { "status": "closed" },
      "track":   { "status": "open" },
      "gym": {
        "status": "appt",
        "reservation": {
          "qrcodeUrl": "https://placehold.co/600x600/png?text=QR",
          "hint": "关注「北师大体育场馆」公众号 → 菜单「预约」"
        }
      },
      "canteen": { "status": "closed" }
    },
    "others": [],
    "lastUpdate": "2026-05-12T00:00:00Z"
  },
  {
    "id": "buaa",
    "cityId": "bj",
    "name": "北京航空航天大学",
    "lat": 39.982,
    "lng": 116.348,
    "status": "alumni",
    "facilities": {
      "library": { "status": "alumni" },
      "track":   { "status": "alumni" },
      "gym":     { "status": "alumni" },
      "canteen": { "status": "alumni" }
    },
    "others": [],
    "lastUpdate": "2026-05-06T00:00:00Z"
  },
  {
    "id": "muc",
    "cityId": "bj",
    "name": "中央民族大学",
    "lat": 39.951,
    "lng": 116.318,
    "status": "open",
    "facilities": {
      "library": { "status": "closed" },
      "track":   { "status": "open" },
      "gym":     { "status": "closed" },
      "canteen": {
        "status": "appt",
        "reservation": {
          "qrcodeUrl": "https://placehold.co/600x600/png?text=QR",
          "hint": "关注「民大餐饮服务」公众号 → 菜单「访客就餐」"
        }
      }
    },
    "others": [],
    "lastUpdate": "2026-05-10T00:00:00Z"
  },
  {
    "id": "bit",
    "cityId": "bj",
    "name": "北京理工大学",
    "lat": 39.962,
    "lng": 116.318,
    "status": "appt",
    "reservation": {
      "qrcodeUrl": "https://placehold.co/600x600/png?text=QR",
      "hint": "关注「北理工参观」公众号 → 菜单「预约入校」"
    },
    "facilities": {
      "library": { "status": "closed" },
      "track":   { "status": "closed" },
      "gym":     { "status": "closed" },
      "canteen": { "status": "closed" }
    },
    "others": [],
    "lastUpdate": "2026-05-05T00:00:00Z"
  },
  {
    "id": "bfsu",
    "cityId": "bj",
    "name": "北京外国语大学",
    "lat": 39.952,
    "lng": 116.305,
    "status": "open",
    "facilities": {
      "library": {
        "status": "appt",
        "reservation": {
          "qrcodeUrl": "https://placehold.co/600x600/png?text=QR",
          "hint": "识别小程序码进入「北外图书馆预约」"
        }
      },
      "track":   { "status": "open" },
      "gym":     { "status": "open" },
      "canteen": { "status": "open" }
    },
    "others": [],
    "lastUpdate": "2026-05-12T00:00:00Z"
  },
  {
    "id": "cau",
    "cityId": "bj",
    "name": "中国农业大学",
    "lat": 40.001,
    "lng": 116.351,
    "status": "open",
    "facilities": {
      "library": {
        "status": "appt",
        "reservation": {
          "qrcodeUrl": "https://placehold.co/600x600/png?text=QR",
          "hint": "关注「中国农大图书馆」公众号 → 菜单「入馆预约」"
        }
      },
      "track":   { "status": "open" },
      "gym": {
        "status": "appt",
        "reservation": {
          "qrcodeUrl": "https://placehold.co/600x600/png?text=QR",
          "hint": "识别小程序码进入「农大体育场馆预约」"
        }
      },
      "canteen": { "status": "open" }
    },
    "others": [],
    "lastUpdate": "2026-05-10T00:00:00Z"
  },
  {
    "id": "bupt",
    "cityId": "bj",
    "name": "北京邮电大学",
    "lat": 39.961,
    "lng": 116.355,
    "status": "closed",
    "facilities": {
      "library": { "status": "closed" },
      "track":   { "status": "closed" },
      "gym":     { "status": "closed" },
      "canteen": { "status": "closed" }
    },
    "others": [],
    "lastUpdate": "2026-05-08T00:00:00Z"
  }
]
```

- [ ] **Step 2: Verify JSON is valid**

```bash
cd backend
python3 -m json.tool seed/schools.json > /dev/null
```

Expected: no output (valid JSON).

- [ ] **Step 3: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add backend/seed/schools.json
git commit -m "feat(backend): seed data — 10 Beijing schools (scope A)"
```

---

## Task 14: Seed import tool

**Files:**
- Create: `backend/seed/seed.go`
- Create: `backend/seed/seed_test.go`

- [ ] **Step 1: Write the failing test**

`backend/seed/seed_test.go`:

```go
package main

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/db"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/repo"
)

func TestImport_RealSchoolsJSON(t *testing.T) {
	// Find schools.json relative to this file.
	jsonPath := filepath.Join(".", "schools.json")
	data, err := os.ReadFile(jsonPath)
	require.NoError(t, err)

	d, err := db.Open(":memory:")
	require.NoError(t, err)
	defer d.Close()

	r := repo.NewSchools(d)
	n, err := importSchools(context.Background(), r, data)
	require.NoError(t, err)
	assert.Equal(t, 10, n)

	// Spot-check that renames + status reclassifications took effect.
	got, err := r.Get(context.Background(), "tsinghua")
	require.NoError(t, err)
	assert.Equal(t, "清华大学", got.Name)

	ruc, err := r.Get(context.Background(), "ruc")
	require.NoError(t, err)
	assert.Equal(t, "open", ruc.Status, "ruc should be reclassified from daytime to open")

	muc, err := r.Get(context.Background(), "muc")
	require.NoError(t, err)
	assert.Equal(t, "中央民族大学", muc.Name)
}
```

- [ ] **Step 2: Write `seed.go`**

`backend/seed/seed.go`:

```go
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
```

- [ ] **Step 3: Run test, verify it passes**

```bash
cd backend
go test ./seed/
```

Expected: PASS, 1 test.

- [ ] **Step 4: Smoke-test the binary end-to-end**

```bash
cd backend
rm -f ddxy.db
make seed
./bin/ddxy &
SERVER_PID=$!
sleep 1
curl -s localhost:8080/api/v1/cities | python3 -m json.tool | head -30
echo "---"
curl -s localhost:8080/api/v1/schools?city=bj | python3 -m json.tool | head -20
echo "---"
curl -s localhost:8080/api/v1/schools/pku | python3 -m json.tool | head -30
kill $SERVER_PID
rm -f ddxy.db
```

Expected:
- `/cities` shows bj with `schools: 10` and `openRate: 0.5` (5 of the 10 are `open`: ruc, bnu, muc, bfsu, cau — verify by counting in `schools.json`)
- `/schools?city=bj` returns 10 entries in summary shape
- `/schools/pku` returns the full detail with reservation + facilities object

- [ ] **Step 5: Commit**

```bash
cd /Users/iloahz/projects/dadaxiaoyuan
git add backend/seed/seed.go backend/seed/seed_test.go
git commit -m "feat(backend): seed import tool — reads schools.json, writes sqlite"
```

---

## Task 15: Run full test suite + final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the entire suite**

```bash
cd backend
go vet ./...
go test ./...
```

Expected: no vet warnings; all packages pass.

- [ ] **Step 2: Format check**

```bash
cd backend
test -z "$(gofmt -l .)" || (gofmt -l . && echo "FAIL: above files need gofmt" && exit 1)
```

Expected: no output (all files formatted).

- [ ] **Step 3: Confirm `make build` produces a runnable binary**

```bash
cd backend
make clean
make build
./bin/ddxy &
SERVER_PID=$!
sleep 1
curl -fsS localhost:8080/healthz
kill $SERVER_PID
rm -f ddxy.db
```

Expected: `ok` printed; no errors.

- [ ] **Step 4: No commit (verification task)**

---

## Spec coverage check

| Spec section | Implemented in |
|---|---|
| `schools` SQLite schema | Task 4 (migration) |
| status 4-value enum + CHECK | Task 4 (migration), enforced everywhere |
| Reservation JSON shape | Task 5 (models) + Task 6 (repo round-trip) |
| `others` JSON array shape | Task 5 (models) + Task 6 (round-trip) |
| `cities.json` 8 cities | Task 3 |
| `GET /api/v1/cities` | Task 8 |
| `GET /api/v1/schools` + `?city=` | Task 9 |
| `GET /api/v1/schools/:id` + 404 | Task 9 |
| `GET /api/v1/dump.json` | Task 10 |
| CORS `*` | Task 11 |
| Config from env vars | Task 2 + Task 12 (main) |
| modernc.org/sqlite + goose | Task 4 |
| Single-binary deploy | Task 12 + Task 15 |
| Seed import (10 北京 schools, slug/status transforms) | Task 13 + Task 14 |
| `thu → tsinghua`, `minzu → muc`, `daytime → open` | Task 13 (seed JSON) + Task 14 test |

## Open questions deferred (from spec §待回答的问题)

- ETag / Last-Modified on `/dump.json` — not implemented; revisit when there's a real consumer
- CORS `*` — implemented as decided in Task 11
