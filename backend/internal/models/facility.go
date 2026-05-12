package models

type Facility struct {
	Status      string       `json:"status"`
	Reservation *Reservation `json:"reservation"`
}

type Other struct {
	Kind        string       `json:"kind"`
	Name        string       `json:"name"`
	Status      string       `json:"status"`
	Reservation *Reservation `json:"reservation,omitempty"`
}
