// Panic recovery middleware.

package middleware

import (
	"errors"
	"karopon/src/api"
	"net/http"
	"runtime/debug"

	"github.com/rs/zerolog/log"
)

// Recoverer is a middleware that recovers from panics, logs the panic (and a
// backtrace), and returns a HTTP 500 (Internal Server Error) status if
// possible. Recoverer prints a request ID if one is provided.
func Recoverer(next http.Handler) http.Handler {

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		tracked := &startedWriter{ResponseWriter: w}

		defer func() {

			rvr := recover()

			if rvr == nil {
				return
			}

			if err, ok := rvr.(error); ok {

				if errors.Is(err, http.ErrAbortHandler) {
					// we don't recover http.ErrAbortHandler so the response
					// to the client is aborted, this should not be logged
					panic(rvr)
				}
			}

			log.
				Error().
				Str("method", r.Method).
				Stringer("url", r.URL).
				Bytes("stack", debug.Stack()).
				Msgf("recovering from panic: %v", rvr)

			// A response that already started cannot be replaced; adding to it would corrupt it.
			if r.Header.Get("Connection") != "Upgrade" && !tracked.started {
				api.WriteStatusProblem(
					w,
					http.StatusInternalServerError,
					"Something went wrong on the server. Try again.",
				)
			}
		}()

		next.ServeHTTP(tracked, r)
	})
}

// startedWriter records whether the handler wrote a status or any body.
type startedWriter struct {
	http.ResponseWriter

	started bool
}

// WriteHeader implements http.ResponseWriter.
func (w *startedWriter) WriteHeader(status int) {
	w.started = true
	w.ResponseWriter.WriteHeader(status)
}

// Write implements http.ResponseWriter.
func (w *startedWriter) Write(b []byte) (int, error) {
	w.started = true

	return w.ResponseWriter.Write(b)
}

// Unwrap lets http.ResponseController reach the underlying writer (flush, hijack, deadlines).
func (w *startedWriter) Unwrap() http.ResponseWriter {
	return w.ResponseWriter
}
