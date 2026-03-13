package ratelimit

import (
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

type entry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// RateLimiter holds per-key rate.Limiters.
type RateLimiter struct {
	mu      sync.Mutex
	entries map[string]*entry
	rate    rate.Limit
	burst   int
	IdleTTL time.Duration
}

// NewRateLimiter creates a RateLimiter.
//
//   - r: sustained request rate (tokens replenished per second).
//   - burst: maximum burst size (tokens a bucket can hold).
//
// Example — allow 5 requests per second with a burst of 20:
//
//	NewRateLimiter(5, 20)
func NewRateLimiter(r rate.Limit, burst int) *RateLimiter {

	rl := &RateLimiter{
		entries: make(map[string]*entry),
		rate:    r,
		burst:   burst,
		IdleTTL: max(time.Minute, time.Duration(float64(time.Second)*float64(burst)/float64(r)*2)),
	}

	return rl
}

func (rl *RateLimiter) getEntry(key string) *rate.Limiter {

	rl.mu.Lock()
	defer rl.mu.Unlock()

	e, ok := rl.entries[key]

	if !ok {
		e = &entry{limiter: rate.NewLimiter(rl.rate, rl.burst)}
		rl.entries[key] = e
	}

	e.lastSeen = time.Now()

	return e.limiter
}

// Allow checks if a key is allowed or should be rate limited.
func (rl *RateLimiter) Allow(key string) bool {
	return rl.getEntry(key).Allow()
}

// CleanIdle removes entries that have been idle for IdleTTL.
func (rl *RateLimiter) CleanIdle() {

	cutoff := time.Now().Add(-rl.IdleTTL)

	rl.mu.Lock()
	for key, e := range rl.entries {
		if e.lastSeen.Before(cutoff) {
			delete(rl.entries, key)
		}
	}
	rl.mu.Unlock()
}

// Middleware returns an http.Handler middleware that rate-limits requests
// using the provided KeyFunc. If the key function returns an empty string,
// the request is passed through without limiting.
//
// Rejected requests receive HTTP 429 Too Many Requests.
func (rl *RateLimiter) Middleware(keyFn KeyFunc) func(http.Handler) http.Handler {

	return func(next http.Handler) http.Handler {

		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := keyFn(r)
			if key == "" {
				next.ServeHTTP(w, r)
				return
			}

			if !rl.getEntry(key).Allow() {
				http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
