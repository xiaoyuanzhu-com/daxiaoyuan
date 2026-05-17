package repo

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/data"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/models"
)

// testCitiesJSON is a minimal cities fixture matching the production
// cities.json subset needed by tests. Loaded once per test that needs it.
const testCitiesJSON = `[
{"id":"bj","name":"北京","country":"CN","code":"110100","lat":39.96,"lng":116.34,"active":true},
{"id":"sh","name":"上海","country":"CN","code":"310100","lat":31.23,"lng":121.47,"active":false}
]`

// newTestRepo writes the given schools to a tempdir/schools/cn and returns a
// loaded *Schools. Also primes data.Load with the bundled cities fixture so
// repo.Insert can resolve cityId → country.
func newTestRepo(t *testing.T, schools ...*models.School) *Schools {
	t.Helper()
	dir := t.TempDir()

	citiesPath := filepath.Join(dir, "cities.json")
	require.NoError(t, os.WriteFile(citiesPath, []byte(testCitiesJSON), 0o644))
	require.NoError(t, data.Load(citiesPath))

	if len(schools) > 0 {
		schoolsDir := filepath.Join(dir, "schools", "cn")
		require.NoError(t, os.MkdirAll(schoolsDir, 0o755))
		for _, s := range schools {
			fillDefaults(s)
			b, err := json.MarshalIndent(s, "", "  ")
			require.NoError(t, err)
			require.NoError(t, os.WriteFile(filepath.Join(schoolsDir, s.ID+".json"), b, 0o644))
		}
	}

	r, err := NewSchools(dir)
	require.NoError(t, err)
	return r
}

// fillDefaults populates missing facility keys and others slice so the seeded
// school satisfies the on-disk schema (all five facility keys present:
// campus + library + track + gym + canteen). Missing keys are filled as
// "closed" so tests only need to set the keys they care about.
func fillDefaults(s *models.School) {
	if s.Facilities == nil {
		s.Facilities = map[string]models.Facility{}
	}
	for _, k := range []string{"campus", "library", "track", "gym", "canteen"} {
		if _, ok := s.Facilities[k]; !ok {
			s.Facilities[k] = models.Facility{Status: "closed"}
		}
	}
	if s.Others == nil {
		s.Others = []models.Other{}
	}
}

func mustTime(s string) time.Time {
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		panic(err)
	}
	return t
}
