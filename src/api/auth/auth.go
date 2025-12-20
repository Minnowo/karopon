package auth

import (
	"context"
	"karopon/src/constants"
	"karopon/src/database"
	"karopon/src/handlers/user"
	"net/http"
	"time"

	"github.com/rs/zerolog/log"
)

var (
	ctxUserKey         = struct{ name string }{name: "user"}
	sessionCookie      = constants.SESSION_COOKIE
	sessionValidCookie = constants.SESSION_VALID_COOKIE
)

// todo: make this a server setting?
const secure bool = false

func ExpireAuthToken(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Expires:  time.Unix(0, 0),
		Path:     "/",
		Name:     sessionCookie,
		Value:    "",
		MaxAge:   -1,
		Secure:   secure,
		HttpOnly: true,
	})
	http.SetCookie(w, &http.Cookie{
		Expires:  time.Unix(0, 0),
		Path:     "/",
		Name:     sessionValidCookie,
		Value:    "",
		MaxAge:   -1,
		Secure:   secure,
		HttpOnly: true,
	})
}

func SetAuthToken(w http.ResponseWriter, token string, expires time.Time) {
	http.SetCookie(w, &http.Cookie{
		Path:     "/",
		Name:     sessionCookie,
		Value:    token,
		Expires:  expires,
		Secure:   secure,
		HttpOnly: true,
	})
	http.SetCookie(w, &http.Cookie{
		Path:     "/",
		Name:     sessionValidCookie,
		Value:    "peko!",
		Expires:  expires,
		Secure:   secure,
		HttpOnly: false,
	})
}

// ParseAuth parses the session cookie into a user from the userReg and adds it to the request.
func ParseAuth(userReg *user.UserRegistry) func(next http.Handler) http.Handler {

	return func(next http.Handler) http.Handler {

		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			authToken, err := r.Cookie(sessionCookie)
			_, err2 := r.Cookie(sessionValidCookie)

			if err != nil || err2 != nil {
				ExpireAuthToken(w)
			} else {

				user, ok := userReg.CheckToken(authToken.Value)

				if ok {
					if user == nil {
						log.Debug().Str("user", "nil").Msg("valid session")
					} else {
						log.Debug().Str("user", user.Name).Int("id", user.ID).Msg("valid session")
					}

					r = PutUser(r, user)
				} else {
					log.Debug().Msg("expired session")

					ExpireAuthToken(w)
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequireAuth requires that the request has a valid user, otherwise it returns a 401.
func RequireAuth() func(next http.Handler) http.Handler {

	return func(next http.Handler) http.Handler {

		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			if !IsAuthed(r) {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// FakeAuth can be used for debugging by always authenticating as the given user.
func FakeAuth(user *database.TblUser, userReg *user.UserRegistry) func(next http.Handler) http.Handler {

	return func(next http.Handler) http.Handler {

		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			log.Debug().Msg("using fake auth")

			r = PutUser(r, user)

			next.ServeHTTP(w, r)
		})
	}
}

// GetUser returns the user authenticated for this request or null
func GetUser(r *http.Request) *database.TblUser {
	u, ok := r.Context().Value(ctxUserKey).(*database.TblUser)
	if ok {
		return u
	}
	return nil
}

// Add the user to this request
func PutUser(r *http.Request, user *database.TblUser) *http.Request {

	ctx := context.WithValue(r.Context(), ctxUserKey, user)

	return r.WithContext(ctx)
}

// IsAuthed returns if the request has a valid user
func IsAuthed(r *http.Request) bool {

	ok := GetUser(r) != nil

	log.Debug().Bool("ok", ok).Msg("IsAuthed")

	return ok
}
