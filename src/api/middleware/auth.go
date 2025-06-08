package middleware

import (
	"context"
	"karopon/src/api"
	"karopon/src/constants"
	"karopon/src/database"
	"karopon/src/handlers/user"
	"net/http"
	"time"

	"github.com/rs/zerolog/log"
)

var (
	SESSION_COOKIE = "session"
)

// If the user provides a valid auth token, the username is set in the context using the config.USER_CONTEXT_KEY
func Auth(userReg *user.UserRegistry) func(next http.Handler) http.Handler {
	return ParseAuth(constants.USER_CONTEXT_KEY, userReg)
}

func FakeAuth(userReg *user.UserRegistry) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			log.Info().Msg("using fake auth")

			user := database.TblUser{
				Name:    "minno",
				ID:      1,
				Created: time.Now(),
			}

			ctx := context.WithValue(context.Background(), constants.USER_CONTEXT_KEY, &user)

			r = r.WithContext(ctx)

			next.ServeHTTP(w, r)
		})
	}
}

// If the user provides a valid auth token, the username is set in the context using the given user key
func ParseAuth(userKey string, userReg *user.UserRegistry) func(next http.Handler) http.Handler {

	return func(next http.Handler) http.Handler {

		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			authToken, err := r.Cookie(SESSION_COOKIE)

			if err == nil {

				user, ok := userReg.CheckToken(authToken.Value)

				if ok {
					if user == nil {
						log.Debug().Msg("USER IS NIL")
					}
					log.Debug().Str("user", user.Name).Msg("valid session")

					ctx := context.WithValue(context.Background(), userKey, user)

					r = r.WithContext(ctx)
				} else {
					log.Debug().Msg("expired session")

					authToken.MaxAge = -1
					authToken.Value = ""
					http.SetCookie(w, authToken)
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

// respond with unauthorized if there was no config.USER_CONTEXT_KEY value set in the context
func RequireAuth() func(next http.Handler) http.Handler {
	return RequireContextString(constants.USER_CONTEXT_KEY)
}

// respond with unauthorized if there was no userKey value set in the context
func RequireContextString(userKey string) func(next http.Handler) http.Handler {

	return func(next http.Handler) http.Handler {

		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			_, ok := r.Context().Value(userKey).(string)

			if !ok {
				api.Unauthorized(w)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
