package main

import (
	"fastslack/shared"
	"fastslack/slack"
	"fastslack/store"
	"fastslack/utils"
	"net/url"
	"strings"

	_ "embed"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

//go:embed scripts/login_style.js
var loginStyleScript string

type SlackAuthService struct {
	mainWindow   *application.WebviewWindow
	loginWindow  *application.WebviewWindow
	Session      *shared.SlackSession
	SlackService *SlackService
}

func (s *SlackAuthService) SlackAuthSuccess(appUrl string) {
	utils.GetAllCookies(s.loginWindow, func(cookies []shared.Cookie, err error) {
		u, _ := url.Parse(appUrl)
		parts := strings.Split(u.Path, "/")
		magicToken := parts[len(parts)-1]
		workspaceId := u.Host

		dCookie, err := slack.RedeemAuthCookies(magicToken, workspaceId, cookies)
		if err != nil {
			println("Auth error:", err.Error())
			return
		}

		session, err := slack.FetchTokens(dCookie)
		if err != nil {
			println("Token fetch error:", err.Error())
			return
		}

		s.Session = session
		s.SlackService.Client = slack.NewClient(session)

		if err := store.SaveSession(session); err != nil {
			println("Failed to save session:", err.Error())
		}

		s.loginWindow.Close()

		if err := s.SlackService.Boot(); err != nil {
			println("Boot error:", err.Error())
			return
		}

		app := application.Get()
		app.Event.Emit("auth:loading", false)
		app.Event.Emit("auth:success", true)

	})
}

func (s *SlackAuthService) MaximiseWindow() {
	s.mainWindow.Focus()
	s.mainWindow.Maximise()
}

func (s *SlackAuthService) GetSession() *shared.SlackSession {
	return s.Session
}

func (s *SlackAuthService) StartLogin() {
	app := application.Get()
	app.Event.Emit("auth:loading", true)
	loginURL := "https://app.slack.com/ssb/signin?" + slack.GenerateSSBParams()

	mx, my := s.mainWindow.Position()

	s.loginWindow = app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:          "Sign in to Slack",
		URL:            loginURL,
		Width:          800,
		Height:         800,
		X:              mx + 50,
		Y:              my + 50,
		BackgroundType: application.BackgroundTypeTransparent,
		Mac: application.MacWindow{
			TitleBar:                application.MacTitleBarHiddenInset,
			Backdrop:                application.MacBackdropTranslucent,
			InvisibleTitleBarHeight: 50,
		},
		BackgroundColour: application.NewRGB(26, 29, 33),
	})

	s.loginWindow.OnWindowEvent(events.Common.WindowClosing, func(event *application.WindowEvent) {
		utils.CleanupNavDelegate(s.loginWindow)
		app.Event.Emit("auth:loading", false)
	})

	s.loginWindow.OnWindowEvent(events.Common.WindowShow, func(event *application.WindowEvent) {
		utils.SetWebviewUserAgent(s.loginWindow, "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36")
		utils.InterceptSlackURL(s.loginWindow, func(url string) {
			s.SlackAuthSuccess(url)
		})
		utils.AddUserScript(s.loginWindow, loginStyleScript)
	})

	s.loginWindow.Show()
}

func (s *SlackAuthService) IsLoggedIn() bool {
	return s.Session != nil
}

func (s *SlackAuthService) Logout() {
	store.ClearSession()
	s.Session = nil
	s.SlackService.Client = nil
	app := application.Get()
	app.Event.Emit("auth:logout", true)
}
