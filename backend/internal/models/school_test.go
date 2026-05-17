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
		Facilities: map[string]Facility{
			"campus":  {Status: "appt"},
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
	assert.Equal(t, "2026-05-09T08:30:00Z", got["lastUpdate"])
	facs := got["facilities"].(map[string]any)
	assert.Len(t, facs, 5)
	assert.Equal(t, "appt", facs["campus"].(map[string]any)["status"])
	assert.Equal(t, "closed", facs["library"].(map[string]any)["status"])
}

func TestSchool_JSON_WithReservation(t *testing.T) {
	s := School{
		ID:     "pku",
		CityID: "bj",
		Name:   "北京大学",
		Lat:    39.992,
		Lng:    116.305,
		Facilities: map[string]Facility{
			"campus": {
				Status: "appt",
				Reservation: &Reservation{
					QrcodeUrl: "https://example.com/qr.png",
					Hint:      "关注「参观北大」公众号",
					Link:      "https://visit.pku.edu.cn",
				},
			},
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

	facs := got["facilities"].(map[string]any)
	campus := facs["campus"].(map[string]any)
	r := campus["reservation"].(map[string]any)
	assert.Equal(t, "https://example.com/qr.png", r["qrcodeUrl"])
	assert.Equal(t, "https://visit.pku.edu.cn", r["link"])
}

func TestReservation_LinkOmittedWhenEmpty(t *testing.T) {
	r := Reservation{QrcodeUrl: "u", Hint: "h"}
	b, err := json.Marshal(r)
	require.NoError(t, err)
	assert.NotContains(t, string(b), `"link"`)
}

func TestReservation_QrcodeUrlOmittedWhenEmpty(t *testing.T) {
	r := Reservation{Hint: "搜索小程序「北大预约」"}
	b, err := json.Marshal(r)
	require.NoError(t, err)
	assert.NotContains(t, string(b), `"qrcodeUrl"`)
}
