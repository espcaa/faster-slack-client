package store

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"

	"github.com/adrg/xdg"
)

type Settings struct {
	ThemeID string `json:"themeId" validate:"required"`
	Mode    string `json:"mode"    validate:"oneof=system light dark"`
}

func DefaultSettings() Settings {
	return Settings{
		ThemeID: "rose-pine",
		Mode:    "system",
	}
}

var settingsMu sync.Mutex

func settingsPath() string {
	return filepath.Join(xdg.ConfigHome, "fastslack", "settings.json")
}

func LoadSettings() (Settings, error) {
	settingsMu.Lock()
	defer settingsMu.Unlock()

	s := DefaultSettings()
	data, err := os.ReadFile(settingsPath())
	if err != nil {
		if os.IsNotExist(err) {
			return s, nil
		}
		return s, err
	}

	if err := json.Unmarshal(data, &s); err != nil {
		return DefaultSettings(), err
	}
	return s, nil
}

func SaveSettings(s Settings) error {
	settingsMu.Lock()
	defer settingsMu.Unlock()

	dir := filepath.Join(xdg.ConfigHome, "fastslack")
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}

	data, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}

	path := settingsPath()
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0600); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}
