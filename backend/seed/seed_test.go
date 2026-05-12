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
