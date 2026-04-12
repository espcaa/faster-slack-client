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

func (c *Client) GetConversationMessages(teamID, channelID, cursor string) (*shared.MessagesResponse, error) {
	params := url.Values{}
	params.Set("channel", channelID)
	params.Set("limit", "28")
	if cursor != "" {
		params.Set("cursor", cursor)
	}

	raw, err := c.Do(teamID, "conversations.history", params)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Ok       bool             `json:"ok"`
		Messages []shared.Message `json:"messages"`
		HasMore  bool             `json:"has_more"`
		Metadata struct {
			NextCursor string `json:"next_cursor"`
		} `json:"response_metadata"`
	}

	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, err
	}

	return &shared.MessagesResponse{
		Messages:   resp.Messages,
		HasMore:    resp.HasMore,
		NextCursor: resp.Metadata.NextCursor,
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

func (c *Client) GetThreadReplies(teamID, channelID, threadTS, cursor string) (*shared.MessagesResponse, error) {
	// set form data
	params := url.Values{}
	params.Set("channel", channelID)
	params.Set("ts", threadTS)
	params.Set("limit", "28")
	if cursor != "" {
		params.Set("cursor", cursor)
	}

	raw, err := c.Do(teamID, "conversations.replies", params)
	if err != nil {
		return nil, err
	}

	var resp struct {
		Ok       bool             `json:"ok"`
		Messages []shared.Message `json:"messages"`
		HasMore  bool             `json:"has_more"`
		Metadata struct {
			NextCursor string `json:"next_cursor"`
		} `json:"response_metadata"`
	}

	if err := json.Unmarshal(raw, &resp); err != nil {
		return nil, err
	}

	return &shared.MessagesResponse{
		Messages:   resp.Messages,
		HasMore:    resp.HasMore,
		NextCursor: resp.Metadata.NextCursor,
	}, nil
}
