package main

import (
	"encoding/json"
	"fastslack/shared"
	"fastslack/slack"
	"fastslack/store"
	"fmt"
	"log"
	"strings"
	"sync"

	lru "github.com/hashicorp/golang-lru/v2"
	"github.com/kyokomi/emoji/v2"
	"github.com/wailsapp/wails/v3/pkg/application"
)

var unicodeEmojiMap = func() map[string]string {
	m := emoji.CodeMap()
	out := make(map[string]string, len(m))
	for code, glyph := range m {
		out[strings.Trim(code, ":")] = glyph
	}
	return out
}()

type SlackService struct {
	Client       *slack.Client
	States       map[string]*store.WorkspaceState
	RTMConns     map[string]*slack.RTMConnection
	UserProfiles *lru.Cache[string, shared.UserProfile]
	EmojiInfos   *lru.Cache[string, shared.Emoji]
	BotProfiles  *lru.Cache[string, shared.AppProfile]
	BotInfos     *lru.Cache[string, shared.BotInfo]

	appReadyOnce sync.Once
	appReadyCh   chan struct{}
}

func (s *SlackService) appReady() chan struct{} {
	s.appReadyOnce.Do(func() {
		s.appReadyCh = make(chan struct{})
	})
	return s.appReadyCh
}

func (s *SlackService) MarkAppReady() {
	ch := s.appReady()
	select {
	case <-ch:
		// already closed
	default:
		close(ch)
	}
}

func (s *SlackService) ResolveBots(teamID string, appIDs []string) (map[string]shared.AppProfile, error) {
	var missing []string
	result := make(map[string]shared.AppProfile)
	seen := make(map[string]struct{}, len(appIDs))

	for _, id := range appIDs {
		if id == "" || seen[id] != struct{}{} {
			seen[id] = struct{}{}

			if profile, ok := s.BotProfiles.Get(id); ok {
				result[id] = profile
			} else {
				missing = append(missing, id)
			}
		}
	}

	var mu sync.Mutex
	var wg sync.WaitGroup

	for _, id := range missing {
		wg.Add(1)
		go func(botID string) {
			defer wg.Done()
			profile, err := s.Client.GetAppProfile(teamID, botID)
			if err != nil {
				return
			}
			s.BotProfiles.Add(profile.ID, *profile)

			mu.Lock()
			result[botID] = *profile
			mu.Unlock()
		}(id)
	}
	wg.Wait()

	return result, nil
}

func (s *SlackService) ResolveUsers(teamID string, userIDs []string) (map[string]shared.UserProfile, error) {
	var missing []string
	result := make(map[string]shared.UserProfile)
	seen := make(map[string]struct{}, len(userIDs))

	for _, id := range userIDs {
		if id == "" {
			continue
		}
		if _, dup := seen[id]; dup {
			continue
		}
		seen[id] = struct{}{}

		if profile, ok := s.UserProfiles.Get(id); ok {
			result[id] = profile
		} else {
			missing = append(missing, id)
		}
	}

	if len(missing) == 0 {
		return result, nil
	}

	fetched, err := s.Client.GetUserProfiles(teamID, missing)
	if err != nil {
		return nil, err
	}
	for _, profile := range fetched {
		s.UserProfiles.Add(profile.ID, profile)
		result[profile.ID] = profile
	}
	return result, nil
}

func (s *SlackService) ResolveEmojis(teamID string, names []string) ([]shared.Emoji, error) {
	// use the cache to resolve as much as possible but use the api for missing ones
	missing := make(map[string]int64)
	var result []shared.Emoji
	seen := make(map[string]struct{}, len(names))

	for _, name := range names {
		if name == "" {
			continue
		}
		if _, dup := seen[name]; dup {
			continue
		}
		seen[name] = struct{}{}

		if glyph, ok := unicodeEmojiMap[name]; ok {
			result = append(result, shared.Emoji{Name: name, Unicode: glyph})
			continue
		}
		if e, ok := s.EmojiInfos.Get(name); ok {
			result = append(result, e)
			continue
		}
		missing[name] = 0
	}

	if len(missing) == 0 {
		return result, nil
	}

	fetched, err := s.Client.GetEmojisInfo(teamID, missing)
	if err != nil {
		return nil, err
	}
	for _, e := range fetched {
		s.EmojiInfos.Add(e.Name, e)
		result = append(result, e)
	}
	return result, nil
}

func (s *SlackService) InvalidateEmojis(names ...string) {
	if s.EmojiInfos == nil {
		return
	}
	for _, name := range names {
		if name == "" {
			continue
		}
		s.EmojiInfos.Remove(name)
	}
}

func (s *SlackService) Boot() error {

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

		if s.BotProfiles == nil {
			botCache, _ := lru.New[string, shared.AppProfile](2000)
			s.BotProfiles = botCache
		}

		if s.BotInfos == nil {
			botInfoCache, _ := lru.New[string, shared.BotInfo](2000)
			s.BotInfos = botInfoCache
		}

		if s.RTMConns == nil {
			s.RTMConns = make(map[string]*slack.RTMConnection)
		}

		// connect to websockets!!
		rtm, err := s.Client.ConnectRTM(teamID, s.handleRTMEvent)
		if err == nil {
			s.RTMConns[teamID] = rtm
		}
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

func (s *SlackService) GetLatestMessages(teamID, channelID string) (*shared.MessagesResponse, error) {

	resp, err := s.Client.GetConversationsMessagesBefore(teamID, channelID, "")

	if err != nil {
		return nil, err
	}

	return resp, nil
}

func (s *SlackService) GetMessagesBefore(teamID, channelID, before string) (*shared.MessagesResponse, error) {

	resp, err := s.Client.GetConversationsMessagesBefore(teamID, channelID, before)

	if err != nil {
		return nil, err
	}

	return resp, nil
}

func (s *SlackService) GetMessagesAfter(teamID, channelID, after string) (*shared.MessagesResponse, error) {

	resp, err := s.Client.GetConversationsMessagesAfter(teamID, channelID, after)

	if err != nil {
		return nil, err
	}

	return resp, nil
}

func (s *SlackService) GetMessagesAround(teamID, channelID, anchor string) (*shared.MessagesResponse, error) {
	resp, err := s.Client.GetConversationsMessagesAround(teamID, channelID, anchor)
	if err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *SlackService) GetChannelInfo(teamID, channelID string) (*shared.Channel, error) {
	state, ok := s.States[teamID]
	if !ok {
		return nil, fmt.Errorf("no state for team %s", teamID)
	}
	if ch, ok := state.Channels[channelID]; ok {
		return &ch, nil
	}
	if im, ok := state.IMs[channelID]; ok {
		return &im, nil
	}
	return nil, fmt.Errorf("channel %s not found", channelID)
}

func (s *SlackService) GetIMs(teamID string) []shared.Channel {
	state, ok := s.States[teamID]
	if !ok {
		return nil
	}
	ims := make([]shared.Channel, 0, len(state.IMs))
	for _, im := range state.IMs {
		ims = append(ims, im)
	}
	return ims
}

func (s *SlackService) SendTyping(teamID, channelID, threadTS string) error {
	rtm, ok := s.RTMConns[teamID]
	if !ok {
		return fmt.Errorf("no RTM connection for team %s", teamID)
	}
	return rtm.SendTyping(channelID, threadTS, 0)
}

func (s *SlackService) SendMessage(teamID, channelID string, blocks string, threadTS string) (string, error) {
	if s.Client == nil {
		return "", fmt.Errorf("not connected")
	}
	resp, err := s.Client.SendMessage(teamID, channelID, json.RawMessage(blocks), threadTS)
	if err != nil {
		return "", err
	}
	type MessageResponse struct {
		TS string `json:"ts"`
	}
	var msgResp MessageResponse
	if err := json.Unmarshal(resp, &msgResp); err != nil {
		return "", err
	}
	return msgResp.TS, nil
}

func (c *SlackService) GetLatestThreadReplies(teamID, channelID, threadTS string) (*shared.MessagesResponse, error) {
	resp, err := c.Client.GetThreadRepliesLatest(teamID, channelID, threadTS, "")
	if err != nil {
		return nil, err
	}
	return resp, nil
}

func (c *SlackService) GetThreadRepliesBefore(teamID, channelID, threadTS, before string) (*shared.MessagesResponse, error) {
	resp, err := c.Client.GetThreadRepliesBefore(teamID, channelID, threadTS, before)
	if err != nil {
		return nil, err
	}
	return resp, nil
}

func (c *SlackService) GetThreadRepliesAfter(teamID, channelID, threadTS, after string) (*shared.MessagesResponse, error) {
	resp, err := c.Client.GetThreadRepliesAfter(teamID, channelID, threadTS, after)
	if err != nil {
		return nil, err
	}
	return resp, nil
}

func (s *SlackService) QuickUserChannelSearch(teamID, query string) ([]shared.SearchResult, error) {
	var results []shared.SearchResult
	query = strings.ToLower(query)

	var dmsUserIds []string
	for _, im := range s.States[teamID].IMs {
		dmsUserIds = append(dmsUserIds, im.User)
	}

	profiles, _ := s.ResolveUsers(teamID, dmsUserIds)

	profileMap := make(map[string]shared.UserProfile)
	for _, p := range profiles {
		profileMap[p.ID] = p
	}

	seen := make(map[string]bool)
	addResult := func(id, name, resType string) {
		if !seen[id] && len(results) < 10 {
			results = append(results, shared.SearchResult{
				ChannelID: id,
				Name:      name,
				Type:      resType,
			})
			seen[id] = true
		}
	}

	for _, ch := range s.States[teamID].Channels {
		if strings.ToLower(ch.Name) == query {
			addResult(ch.ID, ch.Name, "channel")
		}
	}

	for _, im := range s.States[teamID].IMs {
		if p, ok := profileMap[im.User]; ok {
			if strings.ToLower(p.Profile.DisplayName) == query || strings.ToLower(p.Profile.RealName) == query {
				name := p.Profile.DisplayName
				if name == "" {
					name = p.Profile.RealName
				}
				addResult(im.ID, name, "dm")
			}
		}
	}

	if len(results) < 10 {
		for _, ch := range s.States[teamID].Channels {
			if strings.Contains(strings.ToLower(ch.Name), query) {
				addResult(ch.ID, ch.Name, "channel")
			}
		}

		for _, im := range s.States[teamID].IMs {
			if p, ok := profileMap[im.User]; ok {
				if strings.Contains(strings.ToLower(p.Profile.DisplayName), query) ||
					strings.Contains(strings.ToLower(p.Profile.RealName), query) {
					name := p.Profile.DisplayName
					if name == "" {
						name = p.Profile.RealName
					}
					addResult(im.ID, name, "dm")
				}
			}
		}
	}

	return results, nil
}

func (s *SlackService) GetIMByUserID(teamID, userID string) (*shared.Channel, error) {
	state, ok := s.States[teamID]
	if !ok {
		return nil, fmt.Errorf("no state for team %s", teamID)
	}
	for _, im := range state.IMs {
		if im.User == userID {
			return &im, nil
		}
	}
	return nil, fmt.Errorf("IM with user %s not found", userID)
}

func (s *SlackService) DeleteMessage(teamID, channelID, threadTs, ts string) error {
	if err := s.Client.DeleteMessage(teamID, channelID, ts); err != nil {
		return fmt.Errorf("failed to delete message: %w", err)
	}

	payload, err := json.Marshal(map[string]string{
		"type":       "message",
		"subtype":    "message_deleted",
		"channel":    channelID,
		"deleted_ts": ts,
		"thread_ts":  threadTs,
		"ts":         ts,
	})
	if err != nil {
		return fmt.Errorf("failed to marshal message_deleted event: %w", err)
	}

	if app := application.Get(); app != nil {
		app.Event.Emit("slack:message_deleted", string(payload))
	}

	return nil
}

func (s *SlackService) GetAllCategories(teamID string) ([]shared.Category, error) {
	state := s.States[teamID]
	if state == nil {
		return nil, fmt.Errorf("no state for team %s", teamID)
	}

	if state.Categories != nil {
		go s.refreshCategories(teamID)
		return *state.Categories, nil
	}

	return s.refreshCategories(teamID)
}

func (s *SlackService) refreshCategories(teamID string) ([]shared.Category, error) {
	all, _, err := s.Client.GetCategories(teamID, "")
	if err != nil {
		return nil, err
	}

	state := s.States[teamID]
	if state == nil {
		return nil, fmt.Errorf("no state for team %s", teamID)
	}
	state.Categories = &all

	if err := store.SaveWorkspace(teamID, state); err != nil {
		log.Printf("Failed to save workspace with categories for %s: %v\n", teamID, err)
	}

	app := application.Get()
	if app != nil {
		app.Event.Emit("slack:categories_updated", struct {
			TeamID     string
			Categories []shared.Category
		}{
			TeamID:     teamID,
			Categories: all,
		})
	}

	return all, nil
}
