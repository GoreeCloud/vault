package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestReadinessNeverClaimsUsableVault(t *testing.T) {
	for _, route := range []string{"/healthz", "/readyz", "/v1/dev/capabilities"} {
		for _, method := range []string{http.MethodGet, http.MethodHead} {
			t.Run(method+" "+route, func(t *testing.T) {
				r := httptest.NewRequest(method, route, nil)
				w := httptest.NewRecorder()
				handler().ServeHTTP(w, r)
				want := http.StatusOK
				if route == "/readyz" {
					want = http.StatusServiceUnavailable
				}
				if w.Code != want {
					t.Fatalf("got %d, want %d", w.Code, want)
				}
				if w.Header().Get("Cache-Control") != "no-store" {
					t.Fatal("readiness response could be cached")
				}
				if route == "/readyz" && w.Header().Get("Retry-After") == "" {
					t.Fatal("missing retry")
				}
				if method == http.MethodHead {
					if w.Body.Len() != 0 {
						t.Fatal("HEAD returned a body")
					}
					return
				}
				var state capabilities
				if err := json.Unmarshal(w.Body.Bytes(), &state); err != nil {
					t.Fatal(err)
				}
				if state.Ready || state.CredentialsEnabled || state.StorageEnabled || state.SyncEnabled {
					t.Fatalf("incomplete backend advertised as ready: %+v", state)
				}
			})
		}
	}
}

func TestReadinessCannotBeChangedByMutationRequest(t *testing.T) {
	for _, method := range []string{http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete, http.MethodOptions} {
		w := httptest.NewRecorder()
		handler().ServeHTTP(w, httptest.NewRequest(method, "/readyz", nil))
		if w.Code != http.StatusMethodNotAllowed {
			t.Fatalf("%s: %d", method, w.Code)
		}
		if w.Header().Get("Allow") != "GET, HEAD" {
			t.Fatal("unsafe Allow header")
		}
	}
	w := httptest.NewRecorder()
	handler().ServeHTTP(w, httptest.NewRequest("GET", "/readyz", nil))
	if w.Code != http.StatusServiceUnavailable {
		t.Fatal("readiness changed")
	}
}
