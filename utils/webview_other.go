//go:build !darwin

package utils

import (
	"fastslack/shared"

	"github.com/wailsapp/wails/v3/pkg/application"
)

func SetWebviewUserAgent(window application.Window, ua string)          {}
func AddUserScript(window application.Window, js string)                {}
func InterceptSlackURL(window application.Window, handler func(string)) {}
func GetAllCookies(window application.Window, callback func([]shared.Cookie, error)) {
	callback(nil, nil)
}
func CleanupNavDelegate(window application.Window) {}
