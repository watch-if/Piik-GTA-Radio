package protocol

import "errors"

type GtaRadioMessage struct {
	Type    string `json:"type"`
	Station Int    `json:"station"`
}

func (GtaRadioMessage) isClientMessage() {}

func decodeGtaRadio(data []byte) (ClientMessage, error) {
	var message GtaRadioMessage
	present, err := decodeObject(data, &message)
	if err != nil {
		return nil, err
	}
	if err := present.require("type", "station"); err != nil {
		return nil, err
	}
	if message.Station < 0 || message.Station > 21 {
		return nil, errors.New("unknown GTA radio station")
	}
	return message, nil
}

type GtaRadioResultMessage struct {
	Type   string `json:"type"`
	Result string `json:"result"`
}

func (GtaRadioResultMessage) isServerMessage() {}

func decodeGtaRadioResult(data []byte) (ServerMessage, error) {
	var message GtaRadioResultMessage
	present, err := decodeObject(data, &message)
	if err != nil {
		return nil, err
	}
	if err := present.require("type", "result"); err != nil {
		return nil, err
	}
	switch message.Result {
	case "sent", "not-driving", "unavailable", "busy":
		return message, nil
	default:
		return nil, errors.New("unknown GTA radio result")
	}
}
