package models

// CityWithStats is the API response shape for GET /api/v1/cities — the
// static fields from cities.json plus runtime aggregates from the schools
// table.
type CityWithStats struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Country  string  `json:"country"`
	Code     string  `json:"code"`
	Lat      float64 `json:"lat"`
	Lng      float64 `json:"lng"`
	Active   bool    `json:"active"`
	Schools  int     `json:"schools"`
	OpenRate float64 `json:"openRate"`
}
