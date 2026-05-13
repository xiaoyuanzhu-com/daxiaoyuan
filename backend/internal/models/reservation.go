package models

type Reservation struct {
	QrcodeUrl string `json:"qrcodeUrl,omitempty"`
	Hint      string `json:"hint"`
	Link      string `json:"link,omitempty"`
}
