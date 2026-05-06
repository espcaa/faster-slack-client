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
	Name       string `json:"name,omitempty"`
	IsChannel  bool   `json:"is_channel"`
	IsGroup    bool   `json:"is_group"`
	IsIM       bool   `json:"is_im"`
	IsMpIM     bool   `json:"is_mpim"`
	IsPrivate  bool   `json:"is_private"`
	Created    int64  `json:"created"`
	IsArchived bool   `json:"is_archived"`
	Updated    int64  `json:"updated"`
	Creator    string `json:"creator,omitempty"`

	// userBoot fields
	IsGeneral       bool     `json:"is_general,omitempty"`
	NameNormalized  string   `json:"name_normalized,omitempty"`
	IsShared        bool     `json:"is_shared,omitempty"`
	IsFrozen        bool     `json:"is_frozen,omitempty"`
	IsOrgShared     bool     `json:"is_org_shared,omitempty"`
	IsExtShared     bool     `json:"is_ext_shared,omitempty"`
	ContextTeamID   string   `json:"context_team_id,omitempty"`
	SharedTeamIDs   []string `json:"shared_team_ids,omitempty"`
	InternalTeamIDs []string `json:"internal_team_ids,omitempty"`
	Members         []string `json:"members,omitempty"`

	// conversations.info / IM fields
	User          string   `json:"user,omitempty"`
	IsOpen        bool     `json:"is_open,omitempty"`
	LastRead      string   `json:"last_read,omitempty"`
	Priority      int      `json:"priority,omitempty"`
	UnreadCount   int      `json:"unread_count,omitempty"`
	UnreadDisplay int      `json:"unread_count_display,omitempty"`
	Latest        *Message `json:"latest,omitempty"`

	Topic struct {
		Value   string `json:"value"`
		Creator string `json:"creator"`
		LastSet int64  `json:"last_set"`
	} `json:"topic"`
	Purpose struct {
		Value   string `json:"value"`
		Creator string `json:"creator"`
		LastSet int64  `json:"last_set"`
	} `json:"purpose"`

	Properties struct {
		Tabs                []Tab `json:"tabs,omitempty"`
		PostingRestrictedTo *struct {
			Type []string `json:"type"`
			User []string `json:"user"`
		} `json:"posting_restricted_to,omitempty"`
		IsDormant bool `json:"is_dormant,omitempty"`
		Canvas    *struct {
			FileID       string `json:"file_id"`
			IsEmpty      bool   `json:"is_empty"`
			QuipThreadID string `json:"quip_thread_id"`
		} `json:"canvas,omitempty"`
	} `json:"properties"`

	PreviousNames []string `json:"previous_names,omitempty"`
}

type Tab struct {
	Type       string `json:"type"`
	Label      string `json:"label,omitempty"`
	ID         string `json:"id,omitempty"`
	IsDisabled *bool  `json:"is_disabled,omitempty"`
	Data       *struct {
		FileID           string `json:"file_id,omitempty"`
		SharedTS         string `json:"shared_ts,omitempty"`
		MuteEditUpdates  bool   `json:"mute_edit_updates,omitempty"`
		FolderBookmarkID string `json:"folder_bookmark_id,omitempty"`
	} `json:"data,omitempty"`
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
	Ims      []Channel `json:"ims"`
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
	BotProfile  json.RawMessage `json:"bot_profile,omitempty"`
	Files       []File          `json:"files,omitempty"`
	Raw         json.RawMessage `json:"-"`
	BotID       string          `json:"bot_id,omitempty"`
	AppID       string          `json:"app_id,omitempty"`
	Username    string          `json:"username,omitempty"`
	Icons       *AppIcons       `json:"icons,omitempty"`
}

type File struct {
	Id                 string      `json:"id"`
	Created            int64       `json:"created"`
	Timestamp          json.Number `json:"timestamp"`
	MimeType           string      `json:"mimetype"`
	Filetype           string      `json:"filetype"`
	PrettyType         string      `json:"pretty_type"`
	User               string      `json:"user"`
	UserTeam           string      `json:"user_team"`
	Editable           bool        `json:"editable"`
	Size               int64       `json:"size"`
	Mode               string      `json:"mode"`
	IsExternal         bool        `json:"is_external"`
	ExternalType       string      `json:"external_type"`
	IsPublic           bool        `json:"is_public"`
	PublicURLShared    bool        `json:"public_url_shared"`
	DisplayAsBot       bool        `json:"display_as_bot"`
	Username           string      `json:"username,omitempty"`
	Name               string      `json:"name,omitempty"`
	Title              string      `json:"title,omitempty"`
	UrlPrivate         string      `json:"url_private,omitempty"`
	UrlPrivateDownload string      `json:"url_private_download,omitempty"`
	MediaDisplayType   string      `json:"media_display_type,omitempty"`

	// very smol
	Thumb64  string `json:"thumb_64,omitempty"`
	Thumb80  string `json:"thumb_80,omitempty"`
	Thumb160 string `json:"thumb_160,omitempty"`

	Thumb360  string `json:"thumb_360,omitempty"`
	Thumb360W int    `json:"thumb_360_w,omitempty"`
	Thumb360H int    `json:"thumb_360_h,omitempty"`
	Thumb480  string `json:"thumb_480,omitempty"`
	Thumb480W int    `json:"thumb_480_w,omitempty"`
	Thumb480H int    `json:"thumb_480_h,omitempty"`

	Thumb720   string `json:"thumb_720,omitempty"`
	Thumb720W  int    `json:"thumb_720_w,omitempty"`
	Thumb720H  int    `json:"thumb_720_h,omitempty"`
	Thumb800   string `json:"thumb_800,omitempty"`
	Thumb800W  int    `json:"thumb_800_w,omitempty"`
	Thumb800H  int    `json:"thumb_800_h,omitempty"`
	Thumb960   string `json:"thumb_960,omitempty"`
	Thumb960W  int    `json:"thumb_960_w,omitempty"`
	Thumb960H  int    `json:"thumb_960_h,omitempty"`
	Thumb1024  string `json:"thumb_1024,omitempty"`
	Thumb1024W int    `json:"thumb_1024_w,omitempty"`
	Thumb1024H int    `json:"thumb_1024_h,omitempty"`

	ThumbTiny  string `json:"thumb_tiny,omitempty"`
	ThumbPdf   string `json:"thumb_pdf,omitempty"`
	ThumbVideo string `json:"thumb_video,omitempty"`
	ThumbGif   string `json:"thumb_360_gif,omitempty"`

	OriginalW int `json:"original_w,omitempty"`
	OriginalH int `json:"original_h,omitempty"`

	Permalink       string `json:"permalink,omitempty"`
	PermalinkPublic string `json:"permalink_public,omitempty"`
	HasRichPreview  bool   `json:"has_rich_preview,omitempty"`
	IsStarred       bool   `json:"is_starred,omitempty"`
	FileAccess      string `json:"file_access,omitempty"`
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
	Unicode string `json:"unicode,omitempty"`
	Updated int64  `json:"updated"`
}

type SearchResult struct {
	ChannelID string
	Name      string
	Type      string
}

type Category struct {
	ID                   string `json:"channel_section_id"`
	Name                 string `json:"name"`
	Type                 string `json:"type"`
	Emoji                string `json:"emoji,omitempty"`
	NextChannelSectionID string `json:"next_channel_section_id,omitempty"`
	LastUpdated          int64  `json:"last_updated,omitempty"`
	IsRedacted           bool   `json:"is_redacted,omitempty"`
	ChannelIDsPage       struct {
		ChannelIDs []string `json:"channel_ids"`
		Count      int      `json:"count"`
		Cursor     string   `json:"cursor,omitempty"`
	} `json:"channel_ids_page"`
}

type AppIcons struct {
	Emoji         string `json:"emoji,omitempty"`
	ImageOriginal string `json:"image_original,omitempty"`
	Image24       string `json:"image_24,omitempty"`
	Image32       string `json:"image_32,omitempty"`
	Image36       string `json:"image_36,omitempty"`
	Image48       string `json:"image_48,omitempty"`
	Image64       string `json:"image_64,omitempty"`
	Image72       string `json:"image_72,omitempty"`
	Image96       string `json:"image_96,omitempty"`
	Image128      string `json:"image_128,omitempty"`
	Image192      string `json:"image_192,omitempty"`
	Image512      string `json:"image_512,omitempty"`
	Image1024     string `json:"image_1024,omitempty"`
}

type AppCommand struct {
	Usage string `json:"usage"`
	Desc  string `json:"desc"`
	Name  string `json:"name"`
	Type  string `json:"type"`
	App   string `json:"app"`
}

type AppScreenshot struct {
	ID            string `json:"id"`
	Image440      string `json:"image_440,omitempty"`
	Image1000     string `json:"image_1000,omitempty"`
	Image1600     string `json:"image_1600,omitempty"`
	ImageOriginal string `json:"image_original,omitempty"`
}

type AppBotUser struct {
	ID               string `json:"id"`
	Username         string `json:"username"`
	MembershipsCount int    `json:"memberships_count"`
}

type AppAuth struct {
	CreatedBy   string   `json:"created_by"`
	DateCreated string   `json:"date_created"`
	Scopes      []string `json:"scopes"`
	Username    string   `json:"username"`
	FullName    string   `json:"full_name"`
	RealName    string   `json:"real_name"`
	Icons       AppIcons `json:"icons"`
}

type BotInfo struct {
	ID      string   `json:"id"`
	Name    string   `json:"name"`
	AppID   string   `json:"app_id,omitempty"`
	UserID  string   `json:"user_id,omitempty"`
	Deleted bool     `json:"deleted,omitempty"`
	Icons   AppIcons `json:"icons"`
}

type AppProfile struct {
	ID                   string                     `json:"id"`
	Name                 string                     `json:"name"`
	DeveloperName        string                     `json:"developer_name"`
	Desc                 string                     `json:"desc"`
	LongDesc             string                     `json:"long_desc"`
	LongDescFormatted    string                     `json:"long_desc_formatted"`
	URL                  string                     `json:"url"`
	SupportURL           string                     `json:"support_url"`
	ConfigURL            string                     `json:"config_url"`
	AppCardColor         string                     `json:"app_card_color"`
	InstallationSummary  string                     `json:"installation_summary"`
	TeamID               string                     `json:"team_id"`
	EnterpriseID         string                     `json:"enterprise_id"`
	IsCertified          bool                       `json:"is_certified"`
	IsDirectoryPublished bool                       `json:"is_directory_published"`
	IsDistributed        bool                       `json:"is_distributed"`
	IsAIApp              bool                       `json:"is_ai_app"`
	IsAgentApp           bool                       `json:"is_agent_app"`
	IsWorkflowApp        bool                       `json:"is_workflow_app"`
	DateInstalled        int64                      `json:"date_installed"`
	Commands             map[string]AppCommand      `json:"commands"`
	Categories           map[string]json.RawMessage `json:"categories"`
	Screenshots          []AppScreenshot            `json:"screenshots"`
	Icons                AppIcons                   `json:"icons"`
	BotUser              AppBotUser                 `json:"bot_user"`
	Auth                 AppAuth                    `json:"auth"`
	SecurityCompliance   json.RawMessage            `json:"security_compliance,omitempty"`
}
