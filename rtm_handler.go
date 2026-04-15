package main

import (
	"encoding/json"
	"fastslack/shared"
	"fastslack/slack"
	"fastslack/store"
	"log"

	"github.com/wailsapp/wails/v3/pkg/application"
)

func (s *SlackService) handleRTMEvent(teamID string, event slack.RTMEvent) {
	app := application.Get()
	if app == nil {
		log.Printf("App not ready yet, dropping RTM event %s for team %s", event.Type, teamID)
		return
	}

	switch event.Type {
	case "message":
		// check for a subtype
		switch event.SubType {
		case "message_changed":
			log.Printf("Message edited in team %s: %s", teamID, event.Text)

			// take event.raw
			type MessageChangedEvent struct {
				Message shared.Message `json:"message"`
			}
			var changedEvent MessageChangedEvent
			if err := json.Unmarshal(event.Raw, &changedEvent); err != nil {
				log.Printf("Failed to unmarshal message_changed event: %v", err)
				return
			}

			changedEvent.Message.Raw = event.Raw
			store.UpsertMessage(teamID, event.Channel, changedEvent.Message)

			// send event to frontend
			app.Event.Emit("slack:message_changed", string(event.Raw))

		case "message_deleted":
			log.Printf("Message deleted in team %s: %s", teamID, event.Text)

			err := store.DeleteMessage(teamID, event.Channel, event.ThreadTs, event.Ts)
			if err != nil {
				log.Printf("Failed to delete message from database: %v", err)
			}

			// send event to frontend
			app.Event.Emit("slack:message_deleted", string(event.Raw))
		default:
			log.Printf("New message in team %s: %s", teamID, event.Text)
			store.UpsertMessage(teamID, event.Channel, shared.Message{
				Ts:       event.Ts,
				User:     string(event.User),
				Text:     event.Text,
				Type:     event.Type,
				Team:     event.Team,
				ThreadTs: event.ThreadTs,
				Raw:      event.Raw,
			})

			log.Printf("Message stored in database for team %s: %s", teamID, event.Text)

			// send event to frontend
			app.Event.Emit("slack:message", string(event.Raw))
		}
	case "pong":
		log.Printf("We got a pong from team %s :scheming:", teamID)
	default:
		log.Printf("This doesn't seem to be handled yet: %s", event.Type)
	}
}
