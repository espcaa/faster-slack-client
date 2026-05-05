package main

import (
	"encoding/json"
	"fastslack/shared"
	"fastslack/slack"
	"log"

	"github.com/wailsapp/wails/v3/pkg/application"
)

func (s *SlackService) handleRTMEvent(teamID string, event slack.RTMEvent) {
	// Block until the Wails application has finished starting; emitting events
	// before then panics inside wails because customEventProcessor is nil.
	<-s.appReady()

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

			// send event to frontend
			app.Event.Emit("slack:message_changed", string(event.Raw))

		case "message_deleted":
			log.Printf("Message deleted in team %s: %s", teamID, event.Text)

			// send event to frontend
			app.Event.Emit("slack:message_deleted", string(event.Raw))
		default:
			log.Printf("New message in team %s: %s", teamID, event.Text)

			log.Printf("Message stored in database for team %s: %s", teamID, event.Text)

			// send event to frontend
			app.Event.Emit("slack:message", string(event.Raw))
		}
	case "user_typing":
		app.Event.Emit("slack:user_typing", string(event.Raw))
	case "emoji_changed":

		// so we can invalidate the cache for the changed emojis

		var payload struct {
			Names []string `json:"names,omitempty"`
		}
		if err := json.Unmarshal(event.Raw, &payload); err != nil {
			log.Printf("Failed to unmarshal emoji_changed event: %v", err)
			return
		}

		for _, name := range payload.Names {
			s.InvalidateEmojis(teamID, name)
		}

		app.Event.Emit("slack:emoji_changed", string(event.Raw))
	case "pong":
		log.Printf("We got a pong from team %s :scheming:", teamID)
	default:
		log.Printf("This doesn't seem to be handled yet: %s", event.Type)
	}
}
