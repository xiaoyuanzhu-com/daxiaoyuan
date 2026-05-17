package models

import "time"

// School is the full API detail shape returned by GET /api/v1/schools/:id.
// Campus-level open status lives in Facilities["campus"] alongside the four
// concrete facilities (library, track, gym, canteen).
type School struct {
	ID         string              `json:"id"`
	CityID     string              `json:"cityId"`
	Name       string              `json:"name"`
	Logo       string              `json:"logo,omitempty"`
	Address    string              `json:"address,omitempty"`
	Lat        float64             `json:"lat"`
	Lng        float64             `json:"lng"`
	Facilities map[string]Facility `json:"facilities"`
	Others     []Other             `json:"others"`
	LastUpdate time.Time           `json:"lastUpdate"`
}

