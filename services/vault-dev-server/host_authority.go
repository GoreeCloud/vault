package main

import (
	"net"
	"net/http"
	"net/url"
	"strings"
)

// loopbackAuthorityAllowed accepts only literal bound-loopback authority and
// the localhost alias, always with the exact listening port. It ignores
// X-Forwarded-* and Forwarded; no DNS lookup or proxy trust is involved.
func loopbackAuthorityAllowed(authority, listeningAddress string) bool {
	boundHost, boundPort, err := net.SplitHostPort(listeningAddress)
	if err != nil || (boundHost != "127.0.0.1" && boundHost != "::1") {
		return false
	}
	host, port, err := net.SplitHostPort(authority)
	if err != nil || port != boundPort || port == "" {
		return false
	}
	return host == boundHost || strings.EqualFold(host, "localhost")
}

// sameOriginOnLoopback allows only a literal http://origin with the same
// authority as the request. The server is plain HTTP and strictly loopback.
// No URL path, credentials, queries, fragment or Origin:null is permitted.
func sameOriginOnLoopback(origin, requestHost, listeningAddress string) bool {
	if origin == "" {
		return false
	}
	parsed, err := url.Parse(origin)
	if err != nil || parsed.Scheme != "http" || parsed.User != nil || parsed.Opaque != "" ||
		parsed.Host == "" || origin != "http://"+parsed.Host {
		return false
	}
	return loopbackAuthorityAllowed(parsed.Host, listeningAddress) &&
		strings.EqualFold(parsed.Host, requestHost)
}

// loopbackBrowserBoundary applies on the real TCP listener. It rejects
// spoofed Host values even if the TCP destination is 127.0.0.1, and denies
// browser requests with off-origin Origin values. A missing Origin is allowed
// for local CLI diagnostics, not as a credential/authentication mechanism.
func loopbackBrowserBoundary(next http.Handler, listeningAddress string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !loopbackAuthorityAllowed(r.Host, listeningAddress) {
			disclose(w, r, http.StatusMisdirectedRequest)
			return
		}
		origins := r.Header.Values("Origin")
		if len(origins) > 1 || (len(origins) == 1 &&
			!sameOriginOnLoopback(origins[0], r.Host, listeningAddress)) {
			disclose(w, r, http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}
