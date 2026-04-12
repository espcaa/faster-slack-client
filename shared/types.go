package shared

import "encoding/json"

type Cookie struct {
	Name   string `json:"name"`
	Value  string `json:"value"`
	Domain string `json:"domain"`
	Path   string `json:"path"`
}

type WorkspaceSession struct {
	Token        string `json:"token"`
	UserID       string `json:"user_id"`
	TeamName     string `json:"team_name"`
	TeamURL      string `json:"team_url"`
	TeamIcon     string `json:"team_icon"`
	EnterpriseID string `json:"enterprise_id,omitempty"`
}

type SlackSession struct {
	DCookie    string                      `json:"d_cookie"`
	Workspaces map[string]WorkspaceSession `json:"workspaces"`
}

type Channel struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	IsChannel  bool   `json:"is_channel"`
	IsGroup    bool   `json:"is_group"`
	IsIM       bool   `json:"is_im"`
	IsMpIM     bool   `json:"is_mpim"`
	IsPrivate  bool   `json:"is_private"`
	Created    int64  `json:"created"`
	IsArchived bool   `json:"is_archived"`
	Updated    int64  `json:"updated"`
	Creator    string `json:"creator"`
	Topic      struct {
		Value   string `json:"value"`
		Creator string `json:"creator"`
		LastSet int64  `json:"last_set"`
	} `json:"topic"`
	Purpose struct {
		Value   string `json:"value"`
		Creator string `json:"creator"`
		LastSet int64  `json:"last_set"`
	} `json:"purpose"`

	// properties
	Properties struct {
		Tabs                []Tab `json:"tabs"`
		PostingRestrictedTo *struct {
			Type []string `json:"type"`
			User []string `json:"user"`
		} `json:"posting_restricted_to"`
	} `json:"properties"`

	PreviousNames []string `json:"previous_names,omitempty"`
}

type Tab struct {
	Type       string `json:"type"`
	Label      string `json:"label"`
	ID         string `json:"id"`
	IsDisabled *bool  `json:"is_disabled"`
	Data       *struct {
		FileID           string `json:"file_id,omitempty"`
		SharedTS         string `json:"shared_ts,omitempty"`
		MuteEditUpdates  bool   `json:"mute_edit_updates,omitempty"`
		FolderBookmarkID string `json:"folder_bookmark_id,omitempty"`
	} `json:"data"`
}

type Im struct {
	ID         string `json:"id"`
	Created    int64  `json:"created"`
	IsIM       bool   `json:"is_im"`
	IsArchived bool   `json:"is_archived"`
	User       string `json:"user"` // the person you're dming
	IsOpen     bool   `json:"is_open"`
	Properties struct {
		Tabs []Tab `json:"tabs,omitempty"`
	} `json:"properties"`
}

type UserbootResponse struct {
	OK                 bool   `json:"ok"`
	AppCommandsCacheTs string `json:"app_commands_cache_ts"`
	AccountType        struct {
		IsAdmin        bool `json:"is_admin"`
		IsOwner        bool `json:"is_owner"`
		IsPrimaryOwner bool `json:"is_primary_owner"`
	} `json:"account_type"`
	Channels []Channel `json:"channels"`
	Ims      []Im      `json:"ims"`
	Self     struct {
		ID                string `json:"id"`
		Name              string `json:"name"`
		IsBot             bool   `json:"is_bot"`
		Updated           int64  `json:"updated"`
		IsAppUser         bool   `json:"is_app_user"`
		Deleted           bool   `json:"deleted"`
		CompactColor      string `json:"color"` // used to display username in compact mode
		RealName          string `json:"real_name"`
		Timezone          string `json:"tz"`
		TimezoneLabel     string `json:"tz_label"`
		TimezoneOffset    int64  `json:"tz_offset"`
		IsAdmin           bool   `json:"is_admin"`
		IsOwner           bool   `json:"is_owner"`
		IsPrimaryOwner    bool   `json:"is_primary_owner"`
		IsRestricted      bool   `json:"is_restricted"`
		IsUltraRestricted bool   `json:"is_ultra_restricted"`
		FirstLogin        int64  `json:"first_login"`
		Profile           struct {
			RealName               string `json:"real_name"`
			DisplayName            string `json:"display_name"`
			AvatarHash             string `json:"avatar_hash"`
			RealNameNormalized     string `json:"real_name_normalized"`
			DisplayNameNormalized  string `json:"display_name_normalized"`
			ImageOriginal          string `json:"image_original"`
			IsCustomImage          bool   `json:"is_custom_image"`
			FirstName              string `json:"first_name"`
			LastName               string `json:"last_name"`
			Team                   string `json:"team"`
			Title                  string `json:"title"`
			Pronouns               string `json:"pronouns"`
			Phone                  string `json:"phone"`
			Skype                  string `json:"skype"`
			StatusText             string `json:"status_text"`
			StatusEmoji            string `json:"status_emoji"`
			StatusEmojiDisplayInfo []struct {
				DisplayURL string  `json:"display_url"`
				Unicode    *string `json:"unicode"`
			} `json:"status_emoji_display_info"`
			StatusExpiration   int64  `json:"status_expiration"`
			StartDate          string `json:"start_date"`
			OutOfOfficeMessage string `json:"ooo_message"`
		} `json:"profile"`
	} `json:"self"`
	Workspaces []struct {
		ID     string `json:"id"`
		Name   string `json:"name"`
		Url    string `json:"url"`
		Domain string `json:"domain"`
		Icon   struct {
			ImageDefault bool   `json:"image_default"`
			Image68      string `json:"image_68"`
			Image132     string `json:"image_132"`
		} `json:"icon"`
	} `json:"workspaces"`
}

type MessagesResponse struct {
	Messages   []Message `json:"messages"`
	HasMore    bool      `json:"has_more"`
	NextCursor string    `json:"next_cursor"`
}

type Message struct {
	User        string          `json:"user"`
	Text        string          `json:"text"`
	Ts          string          `json:"ts"`
	Type        string          `json:"type"`
	Subtype     string          `json:"subtype,omitempty"`
	Team        string          `json:"team,omitempty"`
	ThreadTs    string          `json:"thread_ts,omitempty"`
	ReplyCount  int             `json:"reply_count,omitempty"`
	LatestReply string          `json:"latest_reply,omitempty"`
	ReplyUsers  []string        `json:"reply_users,omitempty"`
	Blocks      json.RawMessage `json:"blocks,omitempty"`
	Edited      json.RawMessage `json:"edited,omitempty"`
}

type UserProfile struct {
	ID             string `json:"id"`
	Color          string `json:"color"`
	IsBot          bool   `json:"is_bot"`
	Timezone       string `json:"tz"`
	TimezoneLabel  string `json:"tz_label"`
	TimezoneOffset int64  `json:"tz_offset"`
	Profile        struct {
		DisplayName string `json:"display_name"`
		RealName    string `json:"real_name"`
		AvatarHash  string `json:"avatar_hash"`
		Title       string `json:"title"`
		Phone       string `json:"phone"`
		StatusText  string `json:"status_text"`
		StatusEmoji string `json:"status_emoji"`
		FirstName   string `json:"first_name"`
		LastName    string `json:"last_name"`
	} `json:"profile"`
}

type Emoji struct {
	Name    string `json:"name"`
	Url     string `json:"value"`
	Updated int64  `json:"updated"`
}
