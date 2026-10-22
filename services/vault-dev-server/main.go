// GoreeCloud Vault native development service foundation.
// Intentionally no credential storage, identity, encryption, or sync.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path"
	"strings"
	"syscall"
	"time"
)

const defaultListen = "127.0.0.1:8187"

type capabilities struct {
	Service            string `json:"service"`
	Environment        string `json:"environment"`
	CredentialsEnabled bool   `json:"credentials_enabled"`
	SyncEnabled        bool   `json:"sync_enabled"`
	StorageEnabled     bool   `json:"storage_enabled"`
}

func disclose(w http.ResponseWriter, r *http.Request, code int) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Referrer-Policy", "no-referrer")
	w.Header().Set("X-Robots-Tag", "noindex, nofollow")
	w.WriteHeader(code)
	if r.Method != http.MethodHead {
		_ = json.NewEncoder(w).Encode(capabilities{
			Service:            "GoreeCloud Vault",
			Environment:        "development-foundation",
			CredentialsEnabled: false,
			SyncEnabled:        false,
			StorageEnabled:     false,
		})
	}
}

func handler() http.Handler {
	mux := http.NewServeMux()
	health := func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			disclose(w, r, http.StatusMethodNotAllowed)
			return
		}
		disclose(w, r, http.StatusOK)
	}
	mux.HandleFunc("/healthz", health)
	mux.HandleFunc("/v1/dev/capabilities", health)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// Fail closed for every other route. The imported Vault client may
		// introduce new identity, item or sync paths; none are implemented.
		// Do not inspect, persist, log or reflect request payloads.
		w.Header().Set("Retry-After", "3600")
		disclose(w, r, http.StatusServiceUnavailable)
	})
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// ServeMux normally redirects malformed slash paths. This temporary
		// server must not issue redirect responses or normalize API paths.
		if r.URL == nil || r.URL.Path == "" ||
			path.Clean(r.URL.Path) != r.URL.Path ||
			strings.Contains(strings.ToLower(r.URL.EscapedPath()), "%2f") {
			disclose(w, r, http.StatusBadRequest)
			return
		}
		mux.ServeHTTP(w, r)
	})
}

func listenAddress(value string) (string, error) {
	if value == "" {
		value = defaultListen
	}
	host, port, err := net.SplitHostPort(value)
	if err != nil || (host != "127.0.0.1" && host != "::1") {
		return "", errors.New("development server requires a loopback bind")
	}
	if port == "" || port == "0" {
		return "", errors.New("development server requires a fixed port")
	}
	if _, err := net.LookupPort("tcp", port); err != nil {
		return "", errors.New("invalid port")
	}
	return value, nil
}

func serve(ctx context.Context, address string) error {
	listener, err := net.Listen("tcp", address)
	if err != nil {
		return err
	}
	defer listener.Close()
	server := &http.Server{
		Handler: handler(), ReadHeaderTimeout: 4 * time.Second,
		ReadTimeout: 6 * time.Second, WriteTimeout: 6 * time.Second,
		IdleTimeout: 12 * time.Second, MaxHeaderBytes: 8192,
	}
	errorsChannel := make(chan error, 1)
	go func() { errorsChannel <- server.Serve(listener) }()
	log.Print("GoreeCloud Vault development foundation: credential and sync functionality disabled")
	select {
	case <-ctx.Done():
		stopping, cancel := context.WithTimeout(context.Background(), 4*time.Second)
		defer cancel()
		return server.Shutdown(stopping)
	case err := <-errorsChannel:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	}
}

func main() {
	address := flag.String("listen", defaultListen, "loopback listening address")
	flag.Parse()
	bind, err := listenAddress(*address)
	if err != nil {
		log.Fatal(err)
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := serve(ctx, bind); err != nil {
		log.Fatal(err)
	}
}
