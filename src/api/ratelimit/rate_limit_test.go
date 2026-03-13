package ratelimit

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/time/rate"
)

// okHandler is a trivial handler that always returns 200.
var okHandler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
})

func doRequest(handler http.Handler, remoteAddr string) int {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = remoteAddr
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	return rr.Code
}

// TestRateLimit_BurstAllowed verifies that exactly `burst` requests succeed
// before the limiter starts rejecting.
func TestRateLimit_BurstAllowed(t *testing.T) {
	const burst = 5
	rl := NewRateLimiter(1, burst)
	handler := rl.Middleware(ByIPAddressFromTrustedProxy)(okHandler)

	for i := range burst {
		code := doRequest(handler, "1.2.3.4:0")
		assert.Equal(t, http.StatusOK, code, "request %d should be allowed", i+1)
	}

	code := doRequest(handler, "1.2.3.4:0")
	assert.Equal(t, http.StatusTooManyRequests, code, "request after burst should be rejected")
}

// TestRateLimit_IndependentKeys verifies that different keys do not share a bucket.
func TestRateLimit_IndependentKeys(t *testing.T) {
	rl := NewRateLimiter(1, 2)
	handler := rl.Middleware(ByIPAddressFromTrustedProxy)(okHandler)

	// Exhaust the budget for IP A.
	require.Equal(t, http.StatusOK, doRequest(handler, "10.0.0.1:0"))
	require.Equal(t, http.StatusOK, doRequest(handler, "10.0.0.1:0"))
	require.Equal(t, http.StatusTooManyRequests, doRequest(handler, "10.0.0.1:0"))

	// IP B has its own fresh bucket.
	assert.Equal(t, http.StatusOK, doRequest(handler, "10.0.0.2:0"), "different IP should have its own bucket")
}

// TestRateLimit_TokenRefill verifies that tokens are replenished over time.
func TestRateLimit_TokenRefill(t *testing.T) {
	// 1 burst, 100 tokens/second — refills in ~10 ms.
	rl := NewRateLimiter(rate.Limit(100), 1)
	handler := rl.Middleware(ByIPAddressFromTrustedProxy)(okHandler)

	require.Equal(t, http.StatusOK, doRequest(handler, "1.2.3.4:0"))
	require.Equal(t, http.StatusTooManyRequests, doRequest(handler, "1.2.3.4:0"))

	time.Sleep(20 * time.Millisecond)

	assert.Equal(t, http.StatusOK, doRequest(handler, "1.2.3.4:0"), "token should have refilled")
}

// TestRateLimit_EmptyKeySkipsLimit verifies that an empty key bypasses limiting.
func TestRateLimit_EmptyKeySkipsLimit(t *testing.T) {
	rl := NewRateLimiter(1, 1)
	alwaysEmpty := func(r *http.Request) string { return "" }
	handler := rl.Middleware(alwaysEmpty)(okHandler)

	for range 10 {
		assert.Equal(t, http.StatusOK, doRequest(handler, "1.2.3.4:0"), "empty key should never be limited")
	}
}

// TestRateLimit_CustomKeyFunc verifies that a custom KeyFunc controls bucketing.
func TestRateLimit_CustomKeyFunc(t *testing.T) {
	rl := NewRateLimiter(1, 1)
	// Always return the same key regardless of IP, simulating a per-user limiter.
	sameUser := func(r *http.Request) string { return "user:42" }
	handler := rl.Middleware(sameUser)(okHandler)

	require.Equal(t, http.StatusOK, doRequest(handler, "10.0.0.1:0"))
	// Second request from a different IP but same key is rejected.
	assert.Equal(t, http.StatusTooManyRequests, doRequest(handler, "10.0.0.2:0"))
}

// TestKeyByIP_ForwardedFor verifies that X-Forwarded-For is respected.
func TestKeyByIP_ForwardedFor(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "127.0.0.1:0"
	req.Header.Set("X-Forwarded-For", "203.0.113.5, 10.0.0.1")

	assert.Equal(t, "203.0.113.5", ByIPAddressFromTrustedProxy(req))
}

// TestKeyByIP_XRealIP verifies that X-Real-IP is respected when no X-Forwarded-For is present.
func TestKeyByIP_XRealIP(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "127.0.0.1:0"
	req.Header.Set("X-Real-IP", "203.0.113.99")

	assert.Equal(t, "203.0.113.99", ByIPAddressFromTrustedProxy(req))
}

// TestKeyByIP_RemoteAddr verifies fallback to RemoteAddr when no proxy headers are present.
func TestKeyByIP_RemoteAddr(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "192.168.1.1:12345"

	assert.Equal(t, "192.168.1.1", ByIPAddressFromTrustedProxy(req))
}
