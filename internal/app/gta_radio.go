package app

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"
)

func localGtaRadio() func(int) bool {
	localData := os.Getenv("LOCALAPPDATA")
	if runtime.GOOS != "windows" || os.Getenv("PIIK_GTA_RADIO") != "1" || localData == "" {
		return nil
	}
	dir := filepath.Join(localData, "Piik", "GtaRadio")
	return func(station int) bool {
		ready := filepath.Join(dir, "vehicle")
		info, err := os.Stat(ready)
		if err != nil || !info.Mode().IsRegular() || info.Size() > 16 {
			return false
		}
		if age := time.Since(info.ModTime()); age < 0 || age > 2*time.Second {
			return false
		}
		body, err := os.ReadFile(ready)
		if err != nil {
			return false
		}
		vehicle, err := strconv.ParseInt(strings.TrimSpace(string(body)), 10, 32)
		if err != nil || vehicle <= 0 {
			return false
		}
		temp, err := os.CreateTemp(dir, "request-*")
		if err != nil {
			return false
		}
		defer os.Remove(temp.Name())
		_, writeErr := fmt.Fprintf(temp, "%d %d\n", vehicle, station)
		closeErr := temp.Close()
		return writeErr == nil && closeErr == nil &&
			os.Rename(temp.Name(), filepath.Join(dir, "request")) == nil
	}
}
