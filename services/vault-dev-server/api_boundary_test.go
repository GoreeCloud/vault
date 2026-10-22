package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestInheritedClientRoutesFailClosed(t *testing.T) {
	paths := []string{
		"/identity", "/identity/connect/token", "/connect/token", "/api", "/api/ciphers",
		"/notifications/hub", "/accounts", "/accounts/prelogin/password",
		"/ciphers", "/ciphers/00000000-0000-0000-0000-000000000001",
		"/ciphers/create", "/sync", "/folders", "/collections",
		"/organizations", "/providers/id", "/users/id/public-key", "/emergency-access/id", "/sends", "/attachments", "/devices",
		"/two-factor", "/settings/domains", "/policies", "/events",
		"/config", "/hibp",
	}
	methods := []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"}
	for _, route := range paths {
		for _, method := range methods {
			t.Run(method+" "+route, func(t *testing.T) {
				r := httptest.NewRequest(method, route, strings.NewReader("FAKE_ONLY_USER_CONTENT"))
				r.Header.Set("Authorization", "Bearer FAKE_ONLY_TOKEN")
				w := httptest.NewRecorder()
				handler().ServeHTTP(w, r)
				if w.Code != http.StatusServiceUnavailable {
					t.Fatalf("got %d instead of 503", w.Code)
				}
				if w.Header().Get("Retry-After") == "" {
					t.Fatal("missing retry guidance")
				}
				if w.Header().Get("Location") != "" {
					t.Fatal("unexpected redirect")
				}
				if strings.Contains(w.Body.String(), "FAKE_ONLY") {
					t.Fatal("untrusted input echoed")
				}
				if strings.Contains(w.Body.String(), "\"credentials_enabled\":true") {
					t.Fatal("credential service advertised")
				}
				if method == "HEAD" && w.Body.Len() != 0 {
					t.Fatal("HEAD leaked a body")
				}
			})
		}
	}
}

func TestMalformedPathsDoNotRedirectToOtherRoutes(t *testing.T) {
	for _, url := range []string{"/api//ciphers", "/sync/", "/ciphers/../healthz", "/identity/%2fconnect/token", "//accounts"} {
		w := httptest.NewRecorder()
		handler().ServeHTTP(w, httptest.NewRequest("GET", url, nil))
		if w.Code != http.StatusBadRequest {
			t.Errorf("%s got %d, want 400", url, w.Code)
		}
		if w.Header().Get("Location") != "" {
			t.Errorf("%s leaked redirect", url)
		}
	}
}

func TestUnknownFutureRoutesAlsoFailClosed(t *testing.T) {
	for _, route := range []string{"/synchronicity", "/cipherstone", "/accountsettings"} {
		w := httptest.NewRecorder()
		handler().ServeHTTP(w, httptest.NewRequest("GET", route, nil))
		if w.Code != http.StatusServiceUnavailable {
			t.Errorf("%s got %d", route, w.Code)
		}
	}
}
