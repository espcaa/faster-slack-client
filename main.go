package main

import (
	"embed"
	_ "embed"
	"fastslack/slack"
	"fastslack/store"
	"log"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// Wails uses Go's `embed` package to embed the frontend files into the binary.
// Any files in the frontend/dist folder will be embedded into the binary and
// made available to the frontend.
// See https://pkg.go.dev/embed for more information.

//go:embed all:frontend/dist
var assets embed.FS

func init() {
	// Register a custom event whose associated data type is string.
	// This is not required, but the binding generator will pick up registered events
	// and provide a strongly typed JS/TS API for them.
	application.RegisterEvent[string]("time")
}

// main function serves as the application's entry point. It initializes the application, creates a window,
// and starts a goroutine that emits a time-based event every second. It subsequently runs the application and
// logs any error that might occur.
func main() {

	// Create a new Wails application by providing the necessary options.
	// Variables 'Name' and 'Description' are for application metadata.
	// 'Assets' configures the asset server with the 'FS' variable pointing to the frontend files.
	// 'Bind' is a list of Go struct instances. The frontend has access to the methods of these instances.
	// 'Mac' options tailor the application when running an macOS.
	slackService := &SlackService{}
	authService := &SlackAuthService{}

	if session, err := store.LoadSession(); err != nil {
		log.Printf("Failed to load session: %v", err)
	} else if session != nil {
		client := slack.NewClient(session)
		// Verify token is still valid
		valid := false
		for teamID := range session.Workspaces {
			if _, err := client.Do(teamID, "auth.test", nil); err == nil {
				valid = true
				break
			}
		}
		if valid {
			log.Println("Loaded saved session (verified)")
			authService.Session = session
			slackService.Client = client
			if err := slackService.Boot(); err != nil {
				log.Printf("Boot error: %v", err)
			}
		} else {
			log.Println("Saved session expired, clearing")
			store.ClearSession()
		}
	}

	app := application.New(application.Options{
		Name:        "faster-slack-client",
		Description: "",
		Services: []application.Service{
			application.NewService(authService),
			application.NewService(slackService),
		},
		Assets: application.AssetOptions{
			Handler:    application.AssetFileServerFS(assets),
			Middleware: fileProxyMiddleware(slackService),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	mainWindow := app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title: "Window 1",
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		BackgroundColour: application.NewRGB(27, 38, 54),
		URL:              "/",
	})

	authService.mainWindow = mainWindow
	authService.SlackService = slackService

	if authService.Session != nil {
		mainWindow.Maximise()
	}

	// Create a goroutine that emits an event containing the current time every second.
	// The frontend can listen to this event and update the UI accordingly.
	go func() {
		for {
			now := time.Now().Format(time.RFC1123)
			app.Event.Emit("time", now)
			time.Sleep(time.Second)
		}
	}()

	// Run the application. This blocks until the application has been exited.
	err := app.Run()

	// If an error occurred while running the application, log it and exit.
	if err != nil {
		log.Fatal(err)
	}
}
