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
		ID:     "pku",
		CityID: "bj",
		Name:   "北京大学",
		Lat:    39.992,
		Lng:    116.305,
		Status: "appt",
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
		ID:     "pku",
		CityID: "bj",
		Name:   "北京大学",
		Lat:    39.992,
		Lng:    116.305,
		Status: "appt",
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
