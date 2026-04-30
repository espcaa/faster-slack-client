package main

import (
	"fastslack/store"

	"github.com/wailsapp/wails/v3/pkg/application"
)

type SettingsService struct{}

func (s *SettingsService) GetSettings() (store.Settings, error) {
	return store.LoadSettings()
}

func (s *SettingsService) UpdateSettings(v store.Settings) error {
	if err := store.SaveSettings(v); err != nil {
		return err
	}
	application.Get().Event.Emit("settings:changed", v)
	return nil
}
