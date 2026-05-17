package repo

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/xiaoyuanzhu-com/dadaxiaoyuan/backend/internal/models"
)

func TestSchools_List_Empty(t *testing.T) {
	r := newTestRepo(t)
	res, err := r.List(context.Background(), ListParams{})
	require.NoError(t, err)
	assert.Empty(t, res.Schools)
	assert.Equal(t, 0, res.Total)
	assert.False(t, res.HasMore)
}

func TestSchools_List_AllAndByCity(t *testing.T) {
	r := newTestRepo(t,
		&models.School{ID: "pku", CityID: "bj", Name: "北京大学", Lat: 39.99, Lng: 116.30, Status: "appt", LastUpdate: mustTime("2026-05-01T00:00:00Z")},
		&models.School{ID: "fudan", CityID: "sh", Name: "复旦大学", Lat: 31.30, Lng: 121.50, Status: "open", LastUpdate: mustTime("2026-05-02T00:00:00Z")},
	)

	all, err := r.List(context.Background(), ListParams{})
	require.NoError(t, err)
	assert.Len(t, all.Schools, 2)
	assert.Equal(t, 2, all.Total)

	bj, err := r.List(context.Background(), ListParams{CityID: "bj"})
	require.NoError(t, err)
	require.Len(t, bj.Schools, 1)
	assert.Equal(t, "pku", bj.Schools[0].ID)
	assert.Equal(t, "appt", bj.Schools[0].Status)
	// List returns full School records — facility statuses are populated.
	assert.Equal(t, "closed", bj.Schools[0].Facilities["library"].Status)

	miss, err := r.List(context.Background(), ListParams{CityID: "nope"})
	require.NoError(t, err)
	assert.Empty(t, miss.Schools)
}

func TestSchools_List_FuzzyQuery(t *testing.T) {
	r := newTestRepo(t,
		&models.School{ID: "pku", CityID: "bj", Name: "北京大学", Status: "appt", LastUpdate: mustTime("2026-05-01T00:00:00Z")},
		&models.School{ID: "tsinghua", CityID: "bj", Name: "清华大学", Status: "appt", LastUpdate: mustTime("2026-05-02T00:00:00Z")},
		&models.School{ID: "fudan", CityID: "sh", Name: "复旦大学", Status: "open", LastUpdate: mustTime("2026-05-03T00:00:00Z")},
	)

	cases := []struct {
		q    string
		want string
	}{
		{"北", "pku"},
		{"bei", "pku"},
		{"pku", "pku"},
		{"bjdx", "pku"},
		{"清", "tsinghua"},
		{"qhdx", "tsinghua"},
		{"fudan", "fudan"},
	}
	for _, tc := range cases {
		res, err := r.List(context.Background(), ListParams{Query: tc.q})
		require.NoError(t, err, "q=%s", tc.q)
		require.Len(t, res.Schools, 1, "q=%s", tc.q)
		assert.Equal(t, tc.want, res.Schools[0].ID, "q=%s", tc.q)
	}
}

func TestSchools_List_Pagination(t *testing.T) {
	seeded := make([]*models.School, 12)
	for i := 0; i < 12; i++ {
		seeded[i] = &models.School{
			ID: string(rune('a' + i)), CityID: "bj", Name: "x", Status: "open",
			LastUpdate: mustTime("2026-05-01T00:00:00Z").Add(time.Duration(i) * time.Hour),
		}
	}
	r := newTestRepo(t, seeded...)

	page1, err := r.List(context.Background(), ListParams{Page: 1, PageSize: 10})
	require.NoError(t, err)
	assert.Len(t, page1.Schools, 10)
	assert.Equal(t, 12, page1.Total)
	assert.True(t, page1.HasMore)

	page2, err := r.List(context.Background(), ListParams{Page: 2, PageSize: 10})
	require.NoError(t, err)
	assert.Len(t, page2.Schools, 2)
	assert.False(t, page2.HasMore)
}

func TestSchools_Get_NotFound(t *testing.T) {
	r := newTestRepo(t)
	_, err := r.Get(context.Background(), "missing")
	assert.ErrorIs(t, err, ErrNotFound)
}

func TestSchools_Get_FullShape(t *testing.T) {
	r := newTestRepo(t,
		&models.School{
			ID: "pku", CityID: "bj", Name: "北京大学", Address: "北京市海淀区颐和园路 5 号",
			Lat: 39.992, Lng: 116.305, Status: "appt",
			Reservation: &models.Reservation{
				QrcodeUrl: "https://example.com/qr.png",
				Hint:      "关注「参观北大」",
				Link:      "https://visit.pku.edu.cn",
			},
			Facilities: map[string]models.Facility{
				"library": {Status: "closed"},
				"track":   {Status: "closed"},
				"gym":     {Status: "closed"},
				"canteen": {Status: "closed"},
			},
			Others:     []models.Other{{Kind: "swim", Name: "游泳馆", Status: "appt"}},
			LastUpdate: mustTime("2026-05-09T08:30:00Z"),
		},
	)
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
	r := newTestRepo(t)

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
	r := newTestRepo(t,
		&models.School{ID: "a", CityID: "bj", Name: "A", Status: "open", LastUpdate: mustTime("2026-05-01T00:00:00Z")},
		&models.School{ID: "b", CityID: "bj", Name: "B", Status: "open", LastUpdate: mustTime("2026-05-01T00:00:00Z")},
		&models.School{ID: "c", CityID: "bj", Name: "C", Status: "appt", LastUpdate: mustTime("2026-05-01T00:00:00Z")},
		&models.School{ID: "d", CityID: "bj", Name: "D", Status: "closed", LastUpdate: mustTime("2026-05-01T00:00:00Z")},
	)
	stats, err := r.CountByCity(context.Background())
	require.NoError(t, err)
	assert.Equal(t, 4, stats["bj"].Total)
	assert.Equal(t, 2, stats["bj"].Open)
}
