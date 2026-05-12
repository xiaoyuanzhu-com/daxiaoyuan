package repo

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/models"
)

func TestSchools_List_Empty(t *testing.T) {
	d := newTestDB(t)
	r := NewSchools(d)
	out, err := r.List(context.Background(), "")
	require.NoError(t, err)
	assert.Empty(t, out)
}

func TestSchools_List_AllAndByCity(t *testing.T) {
	d := newTestDB(t)
	insertTestSchool(t, d, &models.School{ID: "pku", CityID: "bj", Name: "北京大学", Lat: 39.99, Lng: 116.30, Status: "appt", LastUpdate: mustTime("2026-05-01T00:00:00Z")})
	insertTestSchool(t, d, &models.School{ID: "fudan", CityID: "sh", Name: "复旦大学", Lat: 31.30, Lng: 121.50, Status: "open", LastUpdate: mustTime("2026-05-02T00:00:00Z")})

	r := NewSchools(d)

	all, err := r.List(context.Background(), "")
	require.NoError(t, err)
	assert.Len(t, all, 2)

	bj, err := r.List(context.Background(), "bj")
	require.NoError(t, err)
	require.Len(t, bj, 1)
	assert.Equal(t, "pku", bj[0].ID)
	assert.Equal(t, "appt", bj[0].Status)

	miss, err := r.List(context.Background(), "nope")
	require.NoError(t, err)
	assert.Empty(t, miss)
}

func TestSchools_Get_NotFound(t *testing.T) {
	d := newTestDB(t)
	r := NewSchools(d)
	_, err := r.Get(context.Background(), "missing")
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestSchools_Get_FullShape(t *testing.T) {
	d := newTestDB(t)
	_, err := d.Exec(`INSERT INTO schools (id, city_id, name, address, lat, lng, status, reservation,
		library_status, library_reservation,
		track_status, track_reservation,
		gym_status, gym_reservation,
		canteen_status, canteen_reservation,
		others, last_update)
		VALUES ('pku','bj','北京大学','北京市海淀区颐和园路 5 号',39.992,116.305,'appt',
			'{"qrcodeUrl":"https://example.com/qr.png","hint":"关注「参观北大」","link":"https://visit.pku.edu.cn"}',
			'closed', NULL,
			'closed', NULL,
			'closed', NULL,
			'closed', NULL,
			'[{"kind":"swim","name":"游泳馆","status":"appt"}]',
			'2026-05-09T08:30:00Z')`)
	require.NoError(t, err)

	r := NewSchools(d)
	got, err := r.Get(context.Background(), "pku")
	require.NoError(t, err)

	assert.Equal(t, "pku", got.ID)
	assert.Equal(t, "bj", got.CityID)
	assert.Equal(t, "北京市海淀区颐和园路 5 号", got.Address)
	assert.Equal(t, "appt", got.Status)
	require.NotNil(t, got.Reservation)
	assert.Equal(t, "https://example.com/qr.png", got.Reservation.QrcodeUrl)
	assert.Equal(t, "https://visit.pku.edu.cn", got.Reservation.Link)

	assert.Len(t, got.Facilities, 4)
	assert.Equal(t, "closed", got.Facilities["library"].Status)
	assert.Nil(t, got.Facilities["library"].Reservation)

	require.Len(t, got.Others, 1)
	assert.Equal(t, "swim", got.Others[0].Kind)
	assert.Equal(t, "游泳馆", got.Others[0].Name)
}

func TestSchools_Insert_RoundTrip(t *testing.T) {
	d := newTestDB(t)
	r := NewSchools(d)

	in := &models.School{
		ID: "tsinghua", CityID: "bj", Name: "清华大学", Lat: 40.0, Lng: 116.326, Status: "appt",
		Reservation: &models.Reservation{QrcodeUrl: "https://x.png", Hint: "h"},
		Facilities: map[string]models.Facility{
			"library": {Status: "closed"},
			"track":   {Status: "closed"},
			"gym":     {Status: "closed"},
			"canteen": {Status: "closed"},
		},
		Others:     []models.Other{},
		LastUpdate: mustTime("2026-05-09T00:00:00Z"),
	}
	require.NoError(t, r.Insert(context.Background(), in))

	got, err := r.Get(context.Background(), "tsinghua")
	require.NoError(t, err)
	assert.Equal(t, "清华大学", got.Name)
	require.NotNil(t, got.Reservation)
	assert.Equal(t, "https://x.png", got.Reservation.QrcodeUrl)
}

func TestSchools_CountByCity(t *testing.T) {
	d := newTestDB(t)
	insertTestSchool(t, d, &models.School{ID: "a", CityID: "bj", Name: "A", Status: "open", LastUpdate: mustTime("2026-05-01T00:00:00Z")})
	insertTestSchool(t, d, &models.School{ID: "b", CityID: "bj", Name: "B", Status: "open", LastUpdate: mustTime("2026-05-01T00:00:00Z")})
	insertTestSchool(t, d, &models.School{ID: "c", CityID: "bj", Name: "C", Status: "appt", LastUpdate: mustTime("2026-05-01T00:00:00Z")})
	insertTestSchool(t, d, &models.School{ID: "d", CityID: "bj", Name: "D", Status: "closed", LastUpdate: mustTime("2026-05-01T00:00:00Z")})

	r := NewSchools(d)
	stats, err := r.CountByCity(context.Background())
	require.NoError(t, err)
	assert.Equal(t, 4, stats["bj"].Total)
	assert.Equal(t, 2, stats["bj"].Open)
}
