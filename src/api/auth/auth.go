package auth

import (
	"context"
	"karopon/src/api/userreg"
	"karopon/src/constants"
	"karopon/src/database"
	"net/http"
	"strings"
	"time"

	"github.com/minnowo/log4zero"
)

var (
	ctxUserKey         = struct{ name string }{name: "user"}
	ctxTokenKey        = struct{ name string }{name: "token"}
	sessionCookie      = constants.SESSION_COOKIE
	sessionValidCookie = constants.SESSION_VALID_COOKIE
	tokenHeader        = "Authorization"
	bearerTokenPrefix  = "Bearer "
)

type TokenProvider interface {
	CheckToken(ctx context.Context, tokenStr string) (*database.TblUser, bool)
}

var logger = log4zero.Get("auth-middleware")

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
func ParseAuth(tokenProvider TokenProvider) func(next http.Handler) http.Handler {

	return func(next http.Handler) http.Handler {

		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			token := r.Header.Get(tokenHeader)

			if token == "" {

				authToken, err := r.Cookie(sessionCookie)
				_, err2 := r.Cookie(sessionValidCookie)

				if err != nil || err2 != nil {
					if err == nil || err2 == nil {
						ExpireAuthToken(w)
					}
				} else {
					token = authToken.Value
				}
			} else if strings.HasPrefix(token, bearerTokenPrefix) {
				token = token[len(bearerTokenPrefix):]
			}

			if token != "" {

				user, ok := tokenProvider.CheckToken(r.Context(), token)

				if ok {
					logger.Debug().
						Str("user", user.Name).
						Int("userID", user.ID).
						Str("url", r.URL.String()).
						Msg("Authentication successful")

					r = PutUser(r, user)
					r = putToken(r, token)
				} else {
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
func FakeAuth(user *database.TblUser, userReg *userreg.UserRegistry) func(next http.Handler) http.Handler {

	logger.Debug().Str("user", user.Name).Msg("Registering fake auth")

	return func(next http.Handler) http.Handler {

		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			r = PutUser(r, user)

			next.ServeHTTP(w, r)
		})
	}
}

// GetUser returns the user authenticated for this request or null.
func GetUser(r *http.Request) *database.TblUser {

	u, ok := r.Context().Value(ctxUserKey).(*database.TblUser)

	if ok {
		return u
	}

	return nil
}

// PutUser adds the user to this request.
func PutUser(r *http.Request, user *database.TblUser) *http.Request {

	ctx := context.WithValue(r.Context(), ctxUserKey, user)

	return r.WithContext(ctx)
}

// GetToken returns the raw session token string stored in the request context, or empty string if not present.
func GetToken(r *http.Request) string {

	t, _ := r.Context().Value(ctxTokenKey).(string)

	return t
}

func putToken(r *http.Request, token string) *http.Request {

	ctx := context.WithValue(r.Context(), ctxTokenKey, token)

	return r.WithContext(ctx)
}

// IsAuthed returns if the request has a valid user.
func IsAuthed(r *http.Request) bool {

	ok := GetUser(r) != nil

	return ok
}
