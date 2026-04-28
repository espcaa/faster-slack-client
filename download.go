package main

import (
	"fastslack/utils"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	fhttp "github.com/bogdanfinn/fhttp"
)

func (s *SlackService) DownloadFile(url, name string) (string, error) {
	if s.Client == nil {
		return "", fmt.Errorf("not connected")
	}
	if url == "" {
		return "", fmt.Errorf("missing url")
	}

	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("failed to get home dir: %w", err)
	}
	dir := filepath.Join(home, "Downloads")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("failed to create Downloads dir: %w", err)
	}

	if name == "" {
		name = "download"
	}

	name = filepath.Base(name)

	dest := uniquePath(filepath.Join(dir, name))

	req, err := fhttp.NewRequest("GET", url, nil)
	if err != nil {
		return "", fmt.Errorf("bad url: %w", err)
	}
	req.Header = fhttp.Header{
		"user-agent": {proxyUserAgent},
		"cookie":     {"d=" + s.Client.Session.DCookie},
	}

	resp, err := s.Client.HTTP.Do(req)
	if err != nil {
		return "", fmt.Errorf("upstream error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("upstream status %d", resp.StatusCode)
	}

	f, err := os.Create(dest)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %w", err)
	}
	defer f.Close()

	if _, err := io.Copy(f, resp.Body); err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
	}
	if err := f.Close(); err != nil {
		return "", fmt.Errorf("failed to close file: %w", err)
	}

	// trigger the macos dock bounce thing (nothing on other platforms rn)
	utils.NotifyDownloadFinished(dest)

	return dest, nil
}

func uniquePath(p string) string {
	if _, err := os.Stat(p); os.IsNotExist(err) {
		return p
	}
	ext := filepath.Ext(p)
	base := strings.TrimSuffix(p, ext)
	for i := 1; ; i++ {
		candidate := fmt.Sprintf("%s (%d)%s", base, i, ext)
		if _, err := os.Stat(candidate); os.IsNotExist(err) {
			return candidate
		}
	}
}
