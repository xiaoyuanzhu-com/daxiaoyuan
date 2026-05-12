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
