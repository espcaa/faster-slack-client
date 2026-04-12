package main

import (
	"fastslack/shared"
	"fastslack/slack"
	"fastslack/store"
	"log"

	"github.com/wailsapp/wails/v3/pkg/application"
)

func (s *SlackService) handleRTMEvent(teamID string, event slack.RTMEvent) {
	app := application.Get()

	switch event.Type {
	case "message":
		// check for a subtype
		switch event.SubType {
		case "message_changed":
			log.Printf("Message edited in team %s: %s", teamID, event.Text)
		case "message_deleted":
			log.Printf("Message deleted in team %s: %s", teamID, event.Text)
		default:
			log.Printf("New message in team %s: %s", teamID, event.Text)
			store.UpsertMessage(teamID, event.Channel, shared.Message{
				Ts:       event.Ts,
				User:     string(event.User),
				Text:     event.Text,
				Type:     event.Type,
				Team:     event.Team,
				ThreadTs: event.ThreadTs,
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
