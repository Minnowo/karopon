package middleware

import (
	"errors"
	"net/http"
	"runtime/debug"

	"github.com/rs/zerolog/log"
)

// Recoverer is a middleware that recovers from panics, logs the panic (and a
// backtrace), and returns a HTTP 500 (Internal Server Error) status if
// possible. Recoverer prints a request ID if one is provided.
func Recoverer(next http.Handler) http.Handler {

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

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

			if r.Header.Get("Connection") != "Upgrade" {
				w.WriteHeader(http.StatusInternalServerError)
			}
		}()

		next.ServeHTTP(w, r)
	})
}
