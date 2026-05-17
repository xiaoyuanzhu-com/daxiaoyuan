package data

import (
	"encoding/json"
	"fmt"
	"os"
)

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
	cities []City
	byID   map[string]City
	byCode map[string]City
)

// Load reads cities.json from path and rebuilds the package-level lookups.
// Safe to call multiple times — replaces previous state. Tests may call this
// in setup with a fixture path.
func Load(path string) error {
	b, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read cities.json (%s): %w", path, err)
	}
	var list []City
	if err := json.Unmarshal(b, &list); err != nil {
		return fmt.Errorf("parse cities.json: %w", err)
	}
	idMap := make(map[string]City, len(list))
	codeMap := make(map[string]City, len(list))
	for _, c := range list {
		idMap[c.ID] = c
		codeMap[c.Code] = c
	}
	cities = list
	byID = idMap
	byCode = codeMap
	return nil
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
