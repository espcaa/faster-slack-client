package store

import (
	"embed"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/adrg/xdg"
)

//go:embed themes/*.json
var builtInThemes embed.FS

func ThemesDir() string {
	return filepath.Join(xdg.ConfigHome, "fastslack", "themes")
}

type Palette struct {
	Black         string `json:"black" validate:"required"`
	Red           string `json:"red" validate:"required"`
	Green         string `json:"green" validate:"required"`
	Yellow        string `json:"yellow" validate:"required"`
	Blue          string `json:"blue" validate:"required"`
	Magenta       string `json:"magenta" validate:"required"`
	Cyan          string `json:"cyan" validate:"required"`
	White         string `json:"white" validate:"required"`
	BrightBlack   string `json:"brightBlack" validate:"required"`
	BrightRed     string `json:"brightRed" validate:"required"`
	BrightGreen   string `json:"brightGreen" validate:"required"`
	BrightYellow  string `json:"brightYellow" validate:"required"`
	BrightBlue    string `json:"brightBlue" validate:"required"`
	BrightMagenta string `json:"brightMagenta" validate:"required"`
	BrightCyan    string `json:"brightCyan" validate:"required"`
	BrightWhite   string `json:"brightWhite" validate:"required"`
}

type Theme struct {
	ID string `json:"id"   validate:"required,alphanumdash"`

	Name string `json:"name" validate:"required"`

	Dark Palette `json:"dark" validate:"required"`

	Light Palette `json:"light" validate:"required"`

	Builtin bool `json:"-"`
}

var hexRE = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)

func (t *Theme) Validate() error {
	if t.ID == "" {
		return errors.New("id required")
	}
	if t.Name == "" {
		return errors.New("name required")
	}
	if err := t.Dark.validate("dark"); err != nil {
		return err
	}
	if err := t.Light.validate("light"); err != nil {
		return err
	}
	return nil
}

type InvalidTheme struct {
	Path   string `json:"path"`
	ID     string `json:"id"`
	Reason string `json:"reason"`
}

func (p *Palette) validate(name string) error {
	// test all fields in the palette to be valid hex colors
	for _, color := range []string{
		p.Black, p.Red, p.Green, p.Yellow, p.Blue, p.Magenta, p.Cyan, p.White,
		p.BrightBlack, p.BrightRed, p.BrightGreen, p.BrightYellow, p.BrightBlue, p.BrightMagenta, p.BrightCyan, p.BrightWhite,
	} {
		if !hexRE.MatchString(color) {
			return errors.New("invalid color in " + name + " palette: " + color)
		}
	}
	return nil
}

func LoadThemes() (valid []Theme, invalid []InvalidTheme, err error) {
	seen := make(map[string]int)

	entries, err := builtInThemes.ReadDir("themes")
	if err != nil {
		return nil, nil, err
	}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}

		p := "themes/" + e.Name()
		data, rerr := builtInThemes.ReadFile(p)
		if rerr != nil {
			invalid = append(invalid, InvalidTheme{
				Path:   p,
				Reason: rerr.Error(),
			})
			continue
		}
		t, terr := parseTheme(data)
		if terr != nil {
			invalid = append(invalid, InvalidTheme{
				Path: p,

				Reason: terr.Error(),
			})
			continue
		}
		seen[t.ID] = len(valid)
		valid = append(valid, t)
	}

	userEntries, uerr := os.ReadDir(ThemesDir())
	if uerr != nil && !os.IsNotExist(uerr) {
		return valid, invalid, uerr
	}

	for _, e := range userEntries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		p := filepath.Join(ThemesDir(), e.Name())
		data, rerr := os.ReadFile(p)
		if rerr != nil {
			invalid = append(invalid, InvalidTheme{Path: p, Reason: rerr.Error()})
			continue
		}
		t, terr := parseTheme(data)
		if terr != nil {
			invalid = append(invalid, InvalidTheme{Path: p, ID: t.ID, Reason: terr.Error()})
			continue
		}
		if idx, ok := seen[t.ID]; ok {
			valid[idx] = t
		} else {
			seen[t.ID] = len(valid)
			valid = append(valid, t)
		}
	}

	return valid, invalid, nil
}

func parseTheme(data []byte) (Theme, error) {
	var t Theme
	if err := json.Unmarshal(data, &t); err != nil {
		return t, err
	}
	if err := t.Validate(); err != nil {
		return t, err
	}
	return t, nil
}
