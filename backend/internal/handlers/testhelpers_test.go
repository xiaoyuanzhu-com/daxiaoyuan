package handlers

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/data"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/models"
	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/repo"
)

// testCitiesJSON is the cities fixture shared by handler tests.
const testCitiesJSON = `[
{"id":"bj","name":"北京","country":"CN","code":"110100","lat":39.96,"lng":116.34,"active":true},
{"id":"sh","name":"上海","country":"CN","code":"310100","lat":31.23,"lng":121.47,"active":false},
{"id":"gz","name":"广州","country":"CN","code":"440100","lat":23.13,"lng":113.27,"active":false},
{"id":"sz","name":"深圳","country":"CN","code":"440300","lat":22.54,"lng":114.06,"active":false},
{"id":"nj","name":"南京","country":"CN","code":"320100","lat":32.06,"lng":118.79,"active":false},
{"id":"hz","name":"杭州","country":"CN","code":"330100","lat":30.27,"lng":120.15,"active":false},
{"id":"wh","name":"武汉","country":"CN","code":"420100","lat":30.59,"lng":114.3,"active":false},
{"id":"cd","name":"成都","country":"CN","code":"510100","lat":30.66,"lng":104.06,"active":false}
]`

// newTestRepo writes the given schools to a tempdir/schools/cn, primes
// data.Load with the bundled cities fixture, and returns a loaded *Schools.
func newTestRepo(t *testing.T, schools ...*models.School) *repo.Schools {
	t.Helper()
	dir := t.TempDir()

	citiesPath := filepath.Join(dir, "cities.json")
	require.NoError(t, os.WriteFile(citiesPath, []byte(testCitiesJSON), 0o644))
	require.NoError(t, data.Load(citiesPath))

	if len(schools) > 0 {
		schoolsDir := filepath.Join(dir, "schools", "cn")
		require.NoError(t, os.MkdirAll(schoolsDir, 0o755))
		for _, s := range schools {
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
			b, err := json.MarshalIndent(s, "", "  ")
			require.NoError(t, err)
			require.NoError(t, os.WriteFile(filepath.Join(schoolsDir, s.ID+".json"), b, 0o644))
		}
	}

	r, err := repo.NewSchools(dir)
	require.NoError(t, err)
	return r
}
