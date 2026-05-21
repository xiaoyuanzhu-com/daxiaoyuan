package models

type Reservation struct {
	QrcodeUrl       string `json:"qrcodeUrl,omitempty"`
	Url             string `json:"url,omitempty"`
	Hint            string `json:"hint"`
	Link            string `json:"link,omitempty"`
	OfficialAccount string `json:"officialAccount,omitempty"`
	MiniProgram     string `json:"miniProgram,omitempty"`
}
