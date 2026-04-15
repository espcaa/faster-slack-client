package store

import (
	"database/sql"
	"encoding/json"
	"fastslack/shared"
	"path/filepath"
	"sync"

	_ "modernc.org/sqlite"
)

var (
	msgDB   *sql.DB
	msgOnce sync.Once
)

func openMessageDB() (*sql.DB, error) {
	var err error
	msgOnce.Do(func() {
		dbPath := filepath.Join(cacheDir(), "messages.db")

		msgDB, err = sql.Open("sqlite", dbPath)
		if err != nil {
			return
		}
		_, err = msgDB.Exec(`
			PRAGMA journal_mode=WAL;
			PRAGMA synchronous=NORMAL;

			CREATE TABLE IF NOT EXISTS messages (
    			team_id      TEXT NOT NULL,
    			channel_id   TEXT NOT NULL,
    			ts           TEXT NOT NULL,
    			user         TEXT NOT NULL DEFAULT '',
    			text         TEXT NOT NULL DEFAULT '',
    			type         TEXT NOT NULL DEFAULT '',
    			subtype      TEXT NOT NULL DEFAULT '',
    			team         TEXT NOT NULL DEFAULT '',
    			thread_ts    TEXT NOT NULL DEFAULT '',
    			reply_count  INTEGER NOT NULL DEFAULT 0,
    			latest_reply TEXT NOT NULL DEFAULT '',
    			reply_users  TEXT NOT NULL DEFAULT '',   -- JSON-encoded []string
    			blocks       TEXT NOT NULL DEFAULT '',   -- raw JSON passthrough
    			edited       TEXT NOT NULL DEFAULT '',
    			raw_json     TEXT NOT NULL DEFAULT '',   -- full raw JSON from Slack
    			PRIMARY KEY (team_id, channel_id, thread_ts, ts)
    		);

			CREATE INDEX IF NOT EXISTS idx_messages_channel
				ON messages (team_id, channel_id, thread_ts, ts DESC);
		`)
	})
	return msgDB, err
}

func encodeReplyUsers(users []string) string {
	if len(users) == 0 {
		return ""
	}
	b, _ := json.Marshal(users)
	return string(b)
}

func decodeReplyUsers(s string) []string {
	if s == "" {
		return nil
	}
	var users []string
	json.Unmarshal([]byte(s), &users)
	return users
}

func InitMessageDB() error {
	db, err := openMessageDB()
	if err != nil {
		return err
	}

	// clear all cached messages on startup — the cache is session-only
	// because we miss websocket events between sessions
	_, _ = db.Exec(`DELETE FROM messages`)

	return nil
}

func SaveMessages(teamID, channelID string, msgs []shared.Message) error {
	db, err := openMessageDB()
	if err != nil {
		return err
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`
    INSERT OR REPLACE INTO messages
        (team_id, channel_id, ts, user, text, type, subtype, team, thread_ts, reply_count, latest_reply, reply_users, blocks, edited, raw_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, m := range msgs {
		_, err := stmt.Exec(
			teamID, channelID,
			m.Ts, m.User, m.Text, m.Type, m.Subtype, m.Team, m.ThreadTs,
			m.ReplyCount, m.LatestReply, encodeReplyUsers(m.ReplyUsers), string(m.Blocks), string(m.Edited), string(m.Raw),
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func GetCachedMessages(teamID, channelID string, threadTS string, limit int) ([]shared.Message, error) {
	db, err := openMessageDB()
	if err != nil {
		return nil, err
	}

	var rows *sql.Rows
	if threadTS == "" {
		rows, err = db.Query(`
		SELECT ts, user, text, type, subtype, team, thread_ts, reply_count, latest_reply, reply_users, blocks, edited, raw_json
		FROM messages
		WHERE team_id = ? AND channel_id = ? AND (thread_ts = '' OR thread_ts = ts)
		ORDER BY ts DESC
		LIMIT ?
		`, teamID, channelID, limit)
	} else {
		rows, err = db.Query(`
		SELECT ts, user, text, type, subtype, team, thread_ts, reply_count, latest_reply, reply_users, blocks, edited, raw_json
		FROM messages
		WHERE team_id = ? AND channel_id = ? AND thread_ts = ?
		ORDER BY ts ASC
		LIMIT ?
		`, teamID, channelID, threadTS, limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var msgs []shared.Message
	for rows.Next() {
		var m shared.Message
		var replyUsers, blocks, edited, rawJSON string
		if err := rows.Scan(
			&m.Ts, &m.User, &m.Text, &m.Type, &m.Subtype, &m.Team, &m.ThreadTs,
			&m.ReplyCount, &m.LatestReply, &replyUsers, &blocks, &edited, &rawJSON,
		); err != nil {
			return nil, err
		}
		m.ReplyUsers = decodeReplyUsers(replyUsers)
		if blocks != "" {
			m.Blocks = json.RawMessage(blocks)
		}
		if edited != "" {
			m.Edited = json.RawMessage(edited)
		}
		if rawJSON != "" {
			m.Raw = json.RawMessage(rawJSON)
		}
		msgs = append(msgs, m)
	}
	return msgs, rows.Err()
}

func UpsertMessage(teamID, channelID string, msg shared.Message) error {
	db, err := openMessageDB()
	if err != nil {
		return err
	}

	_, err = db.Exec(`
			INSERT OR REPLACE INTO messages (team_id, channel_id, ts, user, text, type, subtype, team, thread_ts, reply_count, latest_reply, reply_users, blocks, edited, raw_json)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, teamID, channelID, msg.Ts, msg.User, msg.Text, msg.Type, msg.Subtype, msg.Team, msg.ThreadTs,
		msg.ReplyCount, msg.LatestReply, encodeReplyUsers(msg.ReplyUsers), string(msg.Blocks), string(msg.Edited), string(msg.Raw))
	return err
}

func DeleteMessage(teamID, channelID, threadTS, ts string) error {
	db, err := openMessageDB()
	if err != nil {
		return err
	}

	_, err = db.Exec(`
			DELETE FROM messages
			WHERE team_id = ? AND channel_id = ? AND thread_ts = ? AND ts = ?
		`, teamID, channelID, threadTS, ts)
	return err
}
