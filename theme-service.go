package main

import (
	"fastslack/store"
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"sync"
)

type ThemeService struct {
	mu      sync.RWMutex
	valid   []store.Theme
	invalid []store.InvalidTheme
	loaded  bool
}

func (s *ThemeService) load() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.loaded {
		return nil
	}
	v, i, err := store.LoadThemes()
	if err != nil {
		return err
	}
	s.valid, s.invalid, s.loaded = v, i, true
	return nil
}

func (s *ThemeService) ListThemes() ([]store.Theme, error) {
	if err := s.load(); err != nil {
		return nil, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.valid, nil
}

func (s *ThemeService) GetTheme(id string) (store.Theme, error) {
	if err := s.load(); err != nil {
		return store.Theme{}, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	for _, t := range s.valid {
		if t.ID == id {
			return t, nil
		}
	}
	return store.Theme{}, fmt.Errorf("theme %q not found", id)
}

func (s *ThemeService) ListInvalidThemes() ([]store.InvalidTheme, error) {
	if err := s.load(); err != nil {
		return nil, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.invalid, nil
}

func (s *ThemeService) ReloadThemes() error {
	s.mu.Lock()
	s.loaded = false
	s.mu.Unlock()
	return s.load()
}

func (s *ThemeService) OpenThemesDir() error {
	themeDir := GetThemesDir()
	if err := os.MkdirAll(themeDir, 0o700); err != nil {
		return fmt.Errorf("create themes dir: %w", err)
	}
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("explorer", themeDir)
	case "darwin":
		cmd = exec.Command("open", themeDir)
	default:
		cmd = exec.Command("xdg-open", themeDir)
	}
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("open themes dir: %w", err)
	}
	go cmd.Wait()
	return nil
}

func GetThemesDir() string {
	return store.ThemesDir()
}
