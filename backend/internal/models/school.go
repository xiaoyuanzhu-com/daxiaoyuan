package models

import "time"

// School is the full API detail shape returned by GET /api/v1/schools/:id.
type School struct {
	ID          string              `json:"id"`
	CityID      string              `json:"cityId"`
	Name        string              `json:"name"`
	Address     string              `json:"address,omitempty"`
	Lat         float64             `json:"lat"`
	Lng         float64             `json:"lng"`
	Status      string              `json:"status"`
	Reservation *Reservation        `json:"reservation"`
	Facilities  map[string]Facility `json:"facilities"`
	Others      []Other             `json:"others"`
	LastUpdate  time.Time           `json:"lastUpdate"`
}

