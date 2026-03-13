package ratelimit

import (
	"net"
	"net/http"
	"strings"
)

// KeyFunc extracts a rate-limit key from a request.
// Returning an empty string disables rate limiting for that request.
type KeyFunc func(r *http.Request) string

// ByIPAddressFromTrustedProxy uses the client IP address as the rate-limit key.
// It honours X-Forwarded-For and X-Real-IP proxy headers.
func ByIPAddressFromTrustedProxy(r *http.Request) string {

	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {

		if first, _, ok := strings.Cut(fwd, ","); ok {
			return strings.TrimSpace(first)
		}

		return strings.TrimSpace(fwd)
	}

	if realip := r.Header.Get("X-Real-IP"); realip != "" {
		return strings.TrimSpace(realip)
	}

	ip, _, err := net.SplitHostPort(r.RemoteAddr)

	if err != nil {
		return r.RemoteAddr
	}

	return ip
}
