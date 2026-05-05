package slack

import (
	"encoding/json"
	"fastslack/shared"
	"fmt"
	"net/url"
)

func (c *Client) UserBoot(teamID string, minChannelUpdated int64) (*shared.UserbootResponse, error) {
	query := url.Values{}
	params := url.Values{}
	params.Set("version_all_channels", "false")
	params.Set("return_all_relevant_mpdms", "true")
	params.Set("omit_extras", "feature_usage_data,plan_info,salesforce_features")
	if minChannelUpdated > 0 {
		params.Set("min_channel_updated", fmt.Sprintf("%d", minChannelUpdated))
	}

	raw, err := c.DoWithQuery(teamID, "client.userBoot", params, query)
	if err != nil {
		return nil, err
	}

	var resp shared.UserbootResponse
	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, err
	}
	return &resp, nil

}

func (c *Client) GetConversationsMessagesBefore(teamID, channelID, latest string) (*shared.MessagesResponse, error) {
	params := url.Values{}
	params.Set("channel", channelID)
	params.Set("limit", "28")
	params.Set("no_user_profile", "true")
	if latest != "" {
		params.Set("latest", latest)
	}
	raw, err := c.Do(teamID, "conversations.history", params)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Ok       bool              `json:"ok"`
		Messages []json.RawMessage `json:"messages"`
		HasMore  bool              `json:"has_more"`
		Metadata struct {
			NextCursor string `json:"next_cursor"`
		} `json:"response_metadata"`
	}

	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, err
	}

	msgs := make([]shared.Message, len(resp.Messages))
	for i, rawMsg := range resp.Messages {
		if err := json.Unmarshal(rawMsg, &msgs[i]); err != nil {
			return nil, err
		}
		msgs[i].Raw = rawMsg
	}

	if len(msgs) == 0 {
		return &shared.MessagesResponse{
			Messages: msgs,
			HasMore:  resp.HasMore,
			OldestTs: "",
			LatestTs: latest,
		}, nil
	}

	return &shared.MessagesResponse{
		Messages: msgs,
		HasMore:  resp.HasMore,
		OldestTs: msgs[len(msgs)-1].Ts,
		LatestTs: latest,
	}, nil
}

func (c *Client) GetConversationsMessagesAfter(teamID, channelID, oldest string) (*shared.MessagesResponse, error) {
	params := url.Values{}
	params.Set("channel", channelID)
	params.Set("limit", "28")
	params.Set("no_user_profile", "true")
	params.Set("oldest", oldest)

	raw, err := c.Do(teamID, "conversations.history", params)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Ok       bool              `json:"ok"`
		Messages []json.RawMessage `json:"messages"`
		HasMore  bool              `json:"has_more"`
		Metadata struct {
			NextCursor string `json:"next_cursor"`
		} `json:"response_metadata"`
	}

	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, err
	}

	msgs := make([]shared.Message, len(resp.Messages))
	for i, rawMsg := range resp.Messages {
		if err := json.Unmarshal(rawMsg, &msgs[i]); err != nil {
			return nil, err
		}
		msgs[i].Raw = rawMsg
	}

	if len(msgs) == 0 {
		return &shared.MessagesResponse{
			Messages: msgs,
			HasMore:  resp.HasMore,
			OldestTs: oldest,
			LatestTs: "",
		}, nil
	}

	return &shared.MessagesResponse{
		Messages: msgs,
		HasMore:  resp.HasMore,
		OldestTs: oldest,
		LatestTs: msgs[len(msgs)-1].Ts,
	}, nil
}

// fetch a window of messages centered on `anchor` by running before+after in
// parallel (slack has no native "around" endpoint). the anchor itself is
// included via inclusive=true on the before-call.
func (c *Client) GetConversationsMessagesAround(teamID, channelID, anchor string) (*shared.MessagesResponse, error) {
	type res struct {
		resp *shared.MessagesResponse
		err  error
	}
	bch := make(chan res, 1)
	ach := make(chan res, 1)

	go func() {
		params := url.Values{}
		params.Set("channel", channelID)
		params.Set("limit", "28")
		params.Set("no_user_profile", "true")
		params.Set("latest", anchor)
		params.Set("inclusive", "true")
		raw, err := c.Do(teamID, "conversations.history", params)
		if err != nil {
			bch <- res{nil, err}
			return
		}
		r, perr := parseHistoryResp(raw, "", anchor)
		bch <- res{r, perr}
	}()

	go func() {
		params := url.Values{}
		params.Set("channel", channelID)
		params.Set("limit", "28")
		params.Set("no_user_profile", "true")
		params.Set("oldest", anchor)
		raw, err := c.Do(teamID, "conversations.history", params)
		if err != nil {
			ach <- res{nil, err}
			return
		}
		r, perr := parseHistoryResp(raw, anchor, "")
		ach <- res{r, perr}
	}()

	before := <-bch
	after := <-ach
	if before.err != nil {
		return nil, before.err
	}
	if after.err != nil {
		return nil, after.err
	}

	// dedupe (anchor will appear in `before`); slack returns desc, we keep flat
	total := len(before.resp.Messages) + len(after.resp.Messages)
	seen := make(map[string]struct{}, total)
	merged := make([]shared.Message, 0, total)
	for _, m := range before.resp.Messages {
		if _, dup := seen[m.Ts]; dup {
			continue
		}
		seen[m.Ts] = struct{}{}
		merged = append(merged, m)
	}
	for _, m := range after.resp.Messages {
		if _, dup := seen[m.Ts]; dup {
			continue
		}
		seen[m.Ts] = struct{}{}
		merged = append(merged, m)
	}

	return &shared.MessagesResponse{
		Messages: merged,
		HasMore:  before.resp.HasMore || after.resp.HasMore,
	}, nil
}

// shared parser used by all conversations.history paths
func parseHistoryResp(raw []byte, oldestTs, latestTs string) (*shared.MessagesResponse, error) {
	var resp struct {
		Ok       bool              `json:"ok"`
		Messages []json.RawMessage `json:"messages"`
		HasMore  bool              `json:"has_more"`
	}
	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, err
	}
	msgs := make([]shared.Message, len(resp.Messages))
	for i, rawMsg := range resp.Messages {
		if err := json.Unmarshal(rawMsg, &msgs[i]); err != nil {
			return nil, err
		}
		msgs[i].Raw = rawMsg
	}
	return &shared.MessagesResponse{
		Messages: msgs,
		HasMore:  resp.HasMore,
		OldestTs: oldestTs,
		LatestTs: latestTs,
	}, nil
}

func (c *Client) GetUserProfiles(teamID string, userIDs []string) ([]shared.UserProfile, error) {
	updatedIds := make(map[string]int64)
	for _, id := range userIDs {
		if id != "" {
			updatedIds[id] = 0
		}
	}
	if len(updatedIds) == 0 {
		return nil, nil
	}

	raw, err := c.DoEdge(teamID, "users/info", map[string]any{
		"check_interaction":          true,
		"include_profile_only_users": true,
		"updated_ids":                updatedIds,
	})
	if err != nil {
		return nil, err
	}

	var result struct {
		Results []shared.UserProfile `json:"results"`
	}
	if err := json.Unmarshal(raw, &result); err != nil {
		return nil, err
	}

	return result.Results, nil
}

func (c *Client) GetAppProfile(teamID, appID string) (*shared.AppProfile, error) {
	if appID == "" {
		return nil, fmt.Errorf("app id required")
	}
	params := url.Values{}
	params.Set("app", appID)

	raw, err := c.Do(teamID, "apps.profile.get", params)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Ok         bool              `json:"ok"`
		AppProfile shared.AppProfile `json:"app_profile"`
	}
	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, err
	}
	return &resp.AppProfile, nil
}

func (c *Client) GetBotInfo(teamID, botID string) (*shared.BotInfo, error) {
	if botID == "" {
		return nil, fmt.Errorf("bot id required")
	}
	params := url.Values{}
	params.Set("bot", botID)

	raw, err := c.Do(teamID, "bots.info", params)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Ok    bool           `json:"ok"`
		Error string         `json:"error,omitempty"`
		Bot   shared.BotInfo `json:"bot"`
	}
	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, err
	}
	if !resp.Ok {
		return nil, fmt.Errorf("bots.info failed: %s", resp.Error)
	}
	return &resp.Bot, nil
}

func (c *Client) GetEmojisInfo(teamID string, updatedIDs map[string]int64) ([]shared.Emoji, error) {
	if len(updatedIDs) == 0 {
		return nil, nil
	}

	raw, err := c.DoEdge(teamID, "emojis/info", map[string]any{
		"updated_ids": updatedIDs,
	})
	if err != nil {
		return nil, err
	}

	var result struct {
		Results []shared.Emoji `json:"results"`
		Ok      bool           `json:"ok"`
		Error   string         `json:"error,omitempty"`
	}
	if err := json.Unmarshal(raw, &result); err != nil {
		return nil, err
	}

	if !result.Ok {
		return nil, fmt.Errorf("failed to fetch emoji info: %s", result.Error)
	}

	return result.Results, nil
}

func (c *Client) SendMessage(teamID, channelID string, blocks json.RawMessage, threadTS string) (json.RawMessage, error) {
	params := url.Values{}
	params.Set("channel", channelID)
	params.Set("blocks", string(blocks))
	if threadTS != "" {
		params.Set("thread_ts", threadTS)
	}

	return c.Do(teamID, "chat.postMessage", params)
}

func (c *Client) GetThreadRepliesLatest(teamID, channelID, threadTS, oldest string) (*shared.MessagesResponse, error) {
	// set form data
	params := url.Values{}
	params.Set("channel", channelID)
	params.Set("ts", threadTS)
	params.Set("oldest", oldest)
	params.Set("inclusive", "true")
	params.Set("limit", "28")
	if oldest != "" {
		params.Set("cursor", oldest)
	}

	raw, err := c.Do(teamID, "conversations.replies", params)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Ok       bool              `json:"ok"`
		Messages []json.RawMessage `json:"messages"`
		HasMore  bool              `json:"has_more"`
		Metadata struct {
			NextCursor string `json:"next_cursor"`
		} `json:"response_metadata"`
	}

	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, err
	}

	msgs := make([]shared.Message, len(resp.Messages))
	for i, rawMsg := range resp.Messages {
		if err := json.Unmarshal(rawMsg, &msgs[i]); err != nil {
			return nil, err
		}
		msgs[i].Raw = rawMsg
	}

	return &shared.MessagesResponse{
		Messages: msgs,
		HasMore:  resp.HasMore,
		OldestTs: msgs[len(msgs)-1].Ts,
		LatestTs: msgs[0].Ts,
	}, nil
}

func (c *Client) GetThreadRepliesAfter(teamID, channelID, threadTS, oldest string) (*shared.MessagesResponse, error) {
	// set form data
	params := url.Values{}
	params.Set("channel", channelID)
	params.Set("ts", threadTS)
	params.Set("oldest", oldest)
	params.Set("inclusive", "true")
	params.Set("limit", "28")
	if oldest != "" {
		params.Set("cursor", oldest)
	}

	raw, err := c.Do(teamID, "conversations.replies", params)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Ok       bool              `json:"ok"`
		Messages []json.RawMessage `json:"messages"`
		HasMore  bool              `json:"has_more"`
		Metadata struct {
			NextCursor string `json:"next_cursor"`
		} `json:"response_metadata"`
	}

	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, err
	}

	msgs := make([]shared.Message, len(resp.Messages))
	for i, rawMsg := range resp.Messages {
		if err := json.Unmarshal(rawMsg, &msgs[i]); err != nil {
			return nil, err
		}
		msgs[i].Raw = rawMsg
	}

	return &shared.MessagesResponse{
		Messages: msgs,
		HasMore:  resp.HasMore,
		OldestTs: msgs[len(msgs)-1].Ts,
		LatestTs: msgs[0].Ts,
	}, nil
}

func (c *Client) GetThreadRepliesBefore(teamID, channelID, threadTS, latest string) (*shared.MessagesResponse, error) {
	// set form data
	params := url.Values{}
	params.Set("channel", channelID)
	params.Set("ts", threadTS)
	params.Set("latest", latest)
	params.Set("inclusive", "true")
	params.Set("limit", "28")
	if latest != "" {
		params.Set("cursor", latest)
	}

	raw, err := c.Do(teamID, "conversations.replies", params)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Ok       bool              `json:"ok"`
		Messages []json.RawMessage `json:"messages"`
		HasMore  bool              `json:"has_more"`
		Metadata struct {
			NextCursor string `json:"next_cursor"`
		} `json:"response_metadata"`
	}

	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, err
	}

	msgs := make([]shared.Message, len(resp.Messages))
	for i, rawMsg := range resp.Messages {
		if err := json.Unmarshal(rawMsg, &msgs[i]); err != nil {
			return nil, err
		}
		msgs[i].Raw = rawMsg
	}

	return &shared.MessagesResponse{
		Messages: msgs,
		HasMore:  resp.HasMore,
		OldestTs: msgs[len(msgs)-1].Ts,
		LatestTs: msgs[0].Ts,
	}, nil
}

func (c *Client) DeleteMessage(teamID, channelID, ts string) error {
	params := url.Values{}
	params.Set("channel", channelID)
	params.Set("ts", ts)

	_, err := c.Do(teamID, "chat.delete", params)
	return err
}

func (c *Client) GetCategories(teamId string, cursor string) ([]shared.Category, string, error) {
	params := url.Values{}
	if cursor != "" {
		params.Set("cursor", cursor)
	}

	raw, err := c.Do(teamId, "users.channelSections.list", params)
	if err != nil {
		return nil, "", err
	}

	var resp struct {
		Ok         bool              `json:"ok"`
		Categories []shared.Category `json:"channel_sections"`
		Cursor     string            `json:"cursor"`
	}

	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, "", err
	}

	if !resp.Ok {
		return nil, "", fmt.Errorf("failed to fetch categories")
	}

	return resp.Categories, resp.Cursor, nil
}
