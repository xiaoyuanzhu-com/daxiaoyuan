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
