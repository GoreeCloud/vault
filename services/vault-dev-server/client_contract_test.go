package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

type clientRoute struct {
	Method      string `json:"method"`
	Path        string `json:"path"`
	Target      string `json:"target"`
	Implemented bool   `json:"implemented"`
}
type clientInventory struct {
	Implemented                bool          `json:"implemented"`
	CredentialStorageSupported bool          `json:"credential_storage_supported"`
	Routes                     []clientRoute `json:"routes"`
}

// TestImportedClientSurfaceStillRejectsCredentialAPIs prevents an inventory
// item from being misrepresented as a working identity/cipher/sync API. It
// operates on synthetic paths and bodies, without any real network or users.
func TestImportedClientSurfaceStillRejectsCredentialAPIs(t *testing.T) {
	data, err := os.ReadFile("contracts/imported-client-surface.json")
	if err != nil {
		t.Fatal(err)
	}
	var inventory clientInventory
	if err := json.Unmarshal(data, &inventory); err != nil {
		t.Fatal(err)
	}
	if inventory.Implemented || inventory.CredentialStorageSupported || len(inventory.Routes) < 9 {
		t.Fatal("unsupported password service advertised as implemented")
	}
	for _, route := range inventory.Routes {
		if route.Implemented {
			t.Fatalf("implemented claim: %s", route.Path)
		}
		if route.Target != "api" && route.Target != "identity" {
			t.Fatal("invalid destination")
		}
		path := strings.ReplaceAll(route.Path, "{id}", "00000000-0000-0000-0000-000000000001")
		t.Run(route.Method+" "+path, func(t *testing.T) {
			request := httptest.NewRequest(route.Method, path, strings.NewReader("SYNTHETIC_ONLY_CONTENT"))
			request.Header.Set("Authorization", "Bearer SYNTHETIC_ONLY_TOKEN")
			response := httptest.NewRecorder()
			handler().ServeHTTP(response, request)
			if response.Code != http.StatusServiceUnavailable {
				t.Fatalf("inherited client route unexpectedly accepted: %d", response.Code)
			}
			if response.Header().Get("Retry-After") == "" || response.Header().Get("Location") != "" {
				t.Fatal("unsupported client operation redirected or omitted retry hint")
			}
			if strings.Contains(response.Body.String(), "SYNTHETIC_ONLY") ||
				strings.Contains(response.Body.String(), "\"ready\":true") {
				t.Fatal("credential input reflected or readiness misrepresented")
			}
		})
	}
}
