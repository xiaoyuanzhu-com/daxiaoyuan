package data

import (
	_ "embed"
	"encoding/json"
)

//go:embed cities.json
var citiesJSON []byte

type City struct {
	ID      string  `json:"id"`
	Name    string  `json:"name"`
	Country string  `json:"country"`
	Code    string  `json:"code"`
	Lat     float64 `json:"lat"`
	Lng     float64 `json:"lng"`
	Active  bool    `json:"active"`
}

var (
	cities   []City
	byID     map[string]City
	byCode   map[string]City
)

func init() {
	if err := json.Unmarshal(citiesJSON, &cities); err != nil {
		panic("failed to parse embedded cities.json: " + err.Error())
	}
	byID = make(map[string]City, len(cities))
	byCode = make(map[string]City, len(cities))
	for _, c := range cities {
		byID[c.ID] = c
		byCode[c.Code] = c
	}
}

// Cities returns the full city list in declaration order.
func Cities() []City {
	return cities
}

func CityByID(id string) (City, bool) {
	c, ok := byID[id]
	return c, ok
}

func CityByCode(code string) (City, bool) {
	c, ok := byCode[code]
	return c, ok
}
