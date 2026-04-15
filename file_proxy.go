package main

import (
	"io"
	"net/http"
	"strings"

	fhttp "github.com/bogdanfinn/fhttp"
)

const proxyUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_6_0) AppleWebKit/537.36 (KHTML, like Gecko) Slack/4.48.102 Chrome/144.0.7559.236 Electron/40.8.2 Safari/537.36"

func fileProxyMiddleware(svc *SlackService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !strings.HasPrefix(r.URL.Path, "/proxy/file") {
				next.ServeHTTP(w, r)
				return
			}

			targetURL := r.URL.Query().Get("url")
			if targetURL == "" || svc.Client == nil {
				http.Error(w, "bad request", http.StatusBadRequest)
				return
			}

			req, err := fhttp.NewRequest("GET", targetURL, nil)
			if err != nil {
				http.Error(w, "bad url", http.StatusBadRequest)
				return
			}

			req.Header = fhttp.Header{
				"user-agent": {proxyUserAgent},
				"cookie":     {"d=" + svc.Client.Session.DCookie},
			}

			resp, err := svc.Client.HTTP.Do(req)
			if err != nil {
				http.Error(w, "upstream error", http.StatusBadGateway)
				return
			}
			defer resp.Body.Close()

			w.Header().Set("Content-Type", resp.Header.Get("content-type"))
			w.Header().Set("Cache-Control", "private, max-age=3600")
			w.WriteHeader(resp.StatusCode)
			io.Copy(w, resp.Body)
		})
	}
}
