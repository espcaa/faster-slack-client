package main

import (
	"fastslack/shared"
	"fastslack/slack"
	"fastslack/store"
	"fmt"
	"log"

	lru "github.com/hashicorp/golang-lru/v2"
)

type SlackService struct {
	Client       *slack.Client
	States       map[string]*store.WorkspaceState
	UserProfiles *lru.Cache[string, shared.UserProfile]
	EmojiInfos   *lru.Cache[string, shared.Emoji]
}

func (s *SlackService) ResolveUsers(teamID string, userIDs []string) ([]shared.UserProfile, error) {
	var missing []string
	var result []shared.UserProfile

	for _, id := range userIDs {
		if profile, ok := s.UserProfiles.Get(id); ok {
			result = append(result, profile)
		} else {
			missing = append(missing, id)
		}
	}

	if len(missing) > 0 {
		fetched, err := s.Client.GetUserProfiles(teamID, missing)
		if err != nil {
			return nil, err
		}
		for _, p := range fetched {
			s.UserProfiles.Add(p.ID, p)
			result = append(result, p)
		}
	}
	return result, nil
}

func (s *SlackService) ResolveEmojis(teamID string, names []string) ([]shared.Emoji, error) {
	updatedIDs := make(map[string]int64, len(names))
	var result []shared.Emoji

	for _, name := range names {
		if name == "" {
			continue
		}
		if emoji, ok := s.EmojiInfos.Get(name); ok {
			updatedIDs[name] = emoji.Updated
			result = append(result, emoji)
		} else {
			updatedIDs[name] = 0
		}
	}

	fetched, err := s.Client.GetEmojisInfo(teamID, updatedIDs)
	if err != nil {
		return nil, err
	}
	for _, e := range fetched {
		s.EmojiInfos.Add(e.Name, e)
		result = append(result, e)
	}
	return result, nil
}

func (s *SlackService) Boot() error {
	if err := store.InitMessageDB(); err != nil {
		log.Printf("Failed to init message DB: %v\n", err)
	}

	if s.States == nil {
		s.States = make(map[string]*store.WorkspaceState)
	}

	for teamID := range s.Client.Session.Workspaces {
		authResp, err := s.Client.Do(teamID, "auth.test", nil)
		if err != nil {
			return fmt.Errorf("auth.test failed for %s: %w", teamID, err)
		}
		log.Printf("auth.test for %s: %s\n", teamID, string(authResp))

		cached, err := store.LoadWorkspace(teamID)
		if err != nil {
			log.Printf("Failed to load cache for %s: %v\n", teamID, err)
		}

		var minChannelUpdated int64
		if cached != nil {
			minChannelUpdated = cached.MinChannelUpdated
		}

		resp, err := s.Client.UserBoot(teamID, minChannelUpdated)
		if err != nil {
			return fmt.Errorf("userBoot failed for %s: %w", teamID, err)
		}

		var state *store.WorkspaceState
		if cached != nil {
			cached.MergeBoot(resp)
			state = cached
		} else {
			state = store.StateFromBoot(resp)
		}

		s.States[teamID] = state

		if err := store.SaveWorkspace(teamID, state); err != nil {
			log.Printf("Failed to save cache for %s: %v\n", teamID, err)
		}

		if s.States == nil {
			s.States = make(map[string]*store.WorkspaceState)
		}

		if s.UserProfiles == nil {
			userCache, _ := lru.New[string, shared.UserProfile](5000)
			s.UserProfiles = userCache
		}

		if s.EmojiInfos == nil {
			emojiCache, _ := lru.New[string, shared.Emoji](5000)
			s.EmojiInfos = emojiCache
		}

		// connect to websockets!!
		_, err = s.Client.ConnectRTM(teamID, s.handleRTMEvent)
		if err != nil {
			log.Printf("Failed to connect websocket for %s: %v\n", teamID, err)
		}
		log.Printf("Booted %s: %d channels, %d IMs\n", teamID, len(state.Channels), len(state.IMs))
	}

	return nil
}

func (s *SlackService) GetChannels(teamID string) []shared.Channel {
	state, ok := s.States[teamID]
	if !ok {
		return nil
	}
	channels := make([]shared.Channel, 0, len(state.Channels))
	for _, ch := range state.Channels {
		channels = append(channels, ch)
	}
	return channels
}

func (s *SlackService) GetMessages(teamID, channelID, cursor string) (*shared.MessagesResponse, error) {
	if cursor == "" {
		cached, err := store.GetCachedMessages(teamID, channelID, "", 100)
		if err == nil && len(cached) > 0 {
			return &shared.MessagesResponse{Messages: cached, HasMore: true, NextCursor: "cache"}, nil
		}
	}

	if cursor == "cache" {
		cursor = ""
	}

	resp, err := s.Client.GetConversationMessages(teamID, channelID, cursor)
	if err != nil {
		return nil, err
	}

	go store.SaveMessages(teamID, channelID, resp.Messages)
	return resp, nil
}

func (s *SlackService) GetIMs(teamID string) []shared.Im {
	state, ok := s.States[teamID]
	if !ok {
		return nil
	}
	ims := make([]shared.Im, 0, len(state.IMs))
	for _, im := range state.IMs {
		ims = append(ims, im)
	}
	return ims
}

func (c *SlackService) GetThreadMessages(teamID, channelID, threadTS, cursor string) (*shared.MessagesResponse, error) {
	if cursor == "" {
		cached, err := store.GetCachedMessages(teamID, channelID, threadTS, 100)
		// only use cache if we have more than just the parent message
		if err == nil && len(cached) > 1 {
			return &shared.MessagesResponse{Messages: cached, HasMore: false, NextCursor: "cache"}, nil
		}
	}

	if cursor == "cache" {
		cursor = ""
	}

	resp, err := c.Client.GetThreadReplies(teamID, channelID, threadTS, cursor)
	if err != nil {
		return nil, err
	}

	go store.SaveMessages(teamID, channelID, resp.Messages)
	return resp, nil
}
