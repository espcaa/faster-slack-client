package store

import (
	"encoding/json"
	"fastslack/shared"
	"os"
	"path/filepath"

	"github.com/adrg/xdg"
)

type WorkspaceState struct {
	MinChannelUpdated int64                     `json:"min_channel_updated"`
	Channels          map[string]shared.Channel `json:"channels"`
	IMs               map[string]shared.Channel `json:"ims"`
}

func cacheDir() string {
	return filepath.Join(xdg.ConfigHome, "fastslack")
}

func cachePath(teamID string) string {
	return filepath.Join(cacheDir(), teamID+".json")
}

func LoadWorkspace(teamID string) (*WorkspaceState, error) {
	data, err := os.ReadFile(cachePath(teamID))
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var state WorkspaceState
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, err
	}
	return &state, nil
}

func SaveWorkspace(teamID string, state *WorkspaceState) error {
	if err := os.MkdirAll(cacheDir(), 0700); err != nil {
		return err
	}

	data, err := json.Marshal(state)
	if err != nil {
		return err
	}

	return os.WriteFile(cachePath(teamID), data, 0600)
}

func StateFromBoot(resp *shared.UserbootResponse) *WorkspaceState {
	channels := make(map[string]shared.Channel, len(resp.Channels))
	for _, ch := range resp.Channels {
		channels[ch.ID] = ch
	}

	ims := make(map[string]shared.Channel, len(resp.Ims))
	for _, im := range resp.Ims {
		ims[im.ID] = im
	}

	state := &WorkspaceState{
		Channels: channels,
		IMs:      ims,
	}
	state.updateMinChannelUpdated()
	return state
}

func (s *WorkspaceState) MergeBoot(resp *shared.UserbootResponse) {
	for _, ch := range resp.Channels {
		s.Channels[ch.ID] = ch
	}
	for _, im := range resp.Ims {
		s.IMs[im.ID] = im
	}
	s.updateMinChannelUpdated()
}

func (s *WorkspaceState) updateMinChannelUpdated() {
	var max int64
	for _, ch := range s.Channels {
		if ch.Updated > max {
			max = ch.Updated
		}
	}
	s.MinChannelUpdated = max
}
