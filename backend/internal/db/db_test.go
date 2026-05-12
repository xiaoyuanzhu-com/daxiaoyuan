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
