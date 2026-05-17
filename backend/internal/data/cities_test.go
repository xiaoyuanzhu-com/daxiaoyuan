package data

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fixtureCitiesJSON mirrors the production data/cities.json shape for tests.
const fixtureCitiesJSON = `[
{"id":"bj","name":"北京","country":"CN","code":"110100","lat":39.96,"lng":116.34,"active":true},
{"id":"sh","name":"上海","country":"CN","code":"310100","lat":31.23,"lng":121.47,"active":true},
{"id":"gz","name":"广州","country":"CN","code":"440100","lat":23.13,"lng":113.27,"active":true},
{"id":"sz","name":"深圳","country":"CN","code":"440300","lat":22.54,"lng":114.06,"active":true},
{"id":"nj","name":"南京","country":"CN","code":"320100","lat":32.06,"lng":118.79,"active":true},
{"id":"hz","name":"杭州","country":"CN","code":"330100","lat":30.27,"lng":120.15,"active":true},
{"id":"wh","name":"武汉","country":"CN","code":"420100","lat":30.59,"lng":114.30,"active":true},
{"id":"cd","name":"成都","country":"CN","code":"510100","lat":30.66,"lng":104.06,"active":true}
]`

func setup(t *testing.T) {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "cities.json")
	require.NoError(t, os.WriteFile(path, []byte(fixtureCitiesJSON), 0o644))
	require.NoError(t, Load(path))
}

func TestCities_All(t *testing.T) {
	setup(t)
	cs := Cities()
	require.Len(t, cs, 8)
	assert.Equal(t, "bj", cs[0].ID)
	assert.Equal(t, "北京", cs[0].Name)
	assert.True(t, cs[0].Active)
}

func TestCities_ByID(t *testing.T) {
	setup(t)
	c, ok := CityByID("bj")
	require.True(t, ok)
	assert.Equal(t, "110100", c.Code)

	_, ok = CityByID("nope")
	assert.False(t, ok)
}

func TestCities_ByCode(t *testing.T) {
	setup(t)
	c, ok := CityByCode("330100")
	require.True(t, ok)
	assert.Equal(t, "hz", c.ID)

	_, ok = CityByCode("999999")
	assert.False(t, ok)
}

func TestCities_AllActive(t *testing.T) {
	setup(t)
	for _, c := range Cities() {
		assert.True(t, c.Active, "city %s should be active", c.ID)
	}
}

func TestCities_Load_BadPath(t *testing.T) {
	err := Load(filepath.Join(t.TempDir(), "missing.json"))
	assert.Error(t, err)
}
