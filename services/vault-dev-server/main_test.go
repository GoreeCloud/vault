package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestStatusOnlyAndNoCredentials(t *testing.T) {
	for _, path := range []string{"/healthz", "/v1/dev/capabilities"} {
		for _, method := range []string{"GET", "HEAD"} {
			r := httptest.NewRequest(method, path, nil)
			w := httptest.NewRecorder()
			handler().ServeHTTP(w, r)
			if w.Code != 200 {
				t.Fatalf("%s %s: %d", method, path, w.Code)
			}
			if method == "HEAD" && w.Body.Len() != 0 {
				t.Fatal("HEAD contained a body")
			}
			if method == "GET" {
				var c capabilities
				if err := json.Unmarshal(w.Body.Bytes(), &c); err != nil {
					t.Fatal(err)
				}
				if c.CredentialsEnabled || c.SyncEnabled || c.StorageEnabled {
					t.Fatal("unexpected credential capability")
				}
			}
			if w.Header().Get("Cache-Control") != "no-store" {
				t.Fatal("status cached")
			}
		}
	}
}

func TestCredentialRoutesAreClosed(t *testing.T) {
	for _, path := range []string{"/identity/connect/token", "/api/accounts/register", "/api/ciphers", "/api/sync", "/notifications/hub"} {
		for _, method := range []string{"GET", "POST"} {
			r := httptest.NewRequest(method, path, strings.NewReader("SYNTHETIC_SECRET_MARKER"))
			r.Header.Set("Authorization", "Bearer SYNTHETIC_TOKEN_MARKER")
			w := httptest.NewRecorder()
			handler().ServeHTTP(w, r)
			if w.Code != http.StatusServiceUnavailable {
				t.Fatalf("%s %s = %d", method, path, w.Code)
			}
			if strings.Contains(w.Body.String(), "SYNTHETIC_SECRET_MARKER") ||
				strings.Contains(w.Body.String(), "SYNTHETIC_TOKEN_MARKER") {
				t.Fatal("client data leaked")
			}
			if w.Header().Get("Retry-After") == "" {
				t.Fatal("missing retry indication")
			}
		}
	}
}

func TestOtherRoutesAndMethodsDeny(t *testing.T) {
	for _, tc := range []struct {
		method, path string
		status       int
	}{
		{"GET", "/unknown", 503},
		{"POST", "/healthz", 405},
		{"OPTIONS", "/healthz", 405},
	} {
		w := httptest.NewRecorder()
		handler().ServeHTTP(w, httptest.NewRequest(tc.method, tc.path, nil))
		if w.Code != tc.status {
			t.Fatalf("%s %s = %d", tc.method, tc.path, w.Code)
		}
		if w.Header().Get("Access-Control-Allow-Origin") != "" {
			t.Fatal("unexpected CORS")
		}
	}
}

func TestNonLoopbackBindingDenied(t *testing.T) {
	for _, value := range []string{"0.0.0.0:8187", "100.71.27.119:8187", ":8187", "localhost:8187", "127.0.0.1:0", "bad"} {
		if _, err := listenAddress(value); err == nil {
			t.Errorf("unsafe bind accepted: %s", value)
		}
	}
	for _, value := range []string{"", "127.0.0.1:8187", "[::1]:8187"} {
		if _, err := listenAddress(value); err != nil {
			t.Errorf("safe bind rejected: %s: %v", value, err)
		}
	}
}
