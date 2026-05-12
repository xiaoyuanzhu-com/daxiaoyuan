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
