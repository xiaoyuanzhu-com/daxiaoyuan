package models

type Reservation struct {
	QrcodeUrl string `json:"qrcodeUrl"`
	Hint      string `json:"hint"`
	Link      string `json:"link,omitempty"`
}
