package protocol

import "testing"

func TestGtaRadioCommandBounds(t *testing.T) {
	for _, value := range []string{"0", "19", "-1", "20", "null", "\"1\""} {
		_, err := DecodeClientMessage([]byte(`{"type":"gta-radio","station":` + value + `}`))
		wantOK := value == "0" || value == "19"
		if (err == nil) != wantOK {
			t.Errorf("station %s: got %v, want accepted=%v", value, err, wantOK)
		}
	}
}
