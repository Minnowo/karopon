package v1

import (
	"errors"
	"fmt"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/api/userreg"
	"karopon/src/constants"
	"karopon/src/database"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) getLogout(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user != nil {
		authToken, err := r.Cookie(constants.SESSION_COOKIE)

		if err == nil {
			a.UserReg.ExpireToken(authToken.Value)
		}
	}

	auth.ExpireAuthToken(w)
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func (a *APIV1) api_login(w http.ResponseWriter, r *http.Request) {

	r.Body = http.MaxBytesReader(w, r.Body, constants.MAX_LOGIN_FORM_SIZE)

	//nolint:gosec // G120 false positive: the body is capped by MaxBytesReader on the line above.
	if err := r.ParseMultipartForm(constants.MAX_LOGIN_FORM_SIZE); err != nil {

		log.Debug().Err(err).Msg("failed to get multipartReader")
		api.WriteStatusProblem(w, http.StatusBadRequest, "The login could not be read. Reload the page and try again.")

		return
	}

	username := strings.TrimSpace(r.PostFormValue("pon_username"))
	password := r.PostFormValue("pon_password")
	tokenType := r.PostFormValue("pon_token_type")

	log.Info().Str("username", username).Str("tokenType", tokenType).Msg("Handling login call")

	if username == "" || password == "" {
		api.WriteStatusProblem(w, http.StatusBadRequest, "Enter your user name and password.")
		return
	}

	if utf8.RuneCountInString(username) > constants.MAX_USERNAME_LENGTH {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			fmt.Sprintf("User names are at most %d characters. Check your user name.", constants.MAX_USERNAME_LENGTH),
		)

		return
	}

	if len(password) < constants.MIN_PASSWORD_LENGTH {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			fmt.Sprintf("Passwords are at least %d characters. Check your password.", constants.MIN_PASSWORD_LENGTH),
		)

		return
	}

	if len(password) > constants.MAX_USER_PASSWORD_LENGTH {

		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			fmt.Sprintf(
				"Passwords are at most %d characters. Check your password.",
				constants.MAX_USER_PASSWORD_LENGTH,
			),
		)

		return
	}

	token, expires, err := a.UserReg.Login(r.Context(), username, password, r.Header.Get("User-Agent"))

	if err != nil {

		if errors.Is(err, userreg.ErrUserDoesNotExist) ||
			errors.Is(err, userreg.ErrUserPasswordDoesNotMatch) {
			api.WriteStatusProblem(w, http.StatusUnauthorized, "The user name or password is not right. Try again.")
		} else {
			api.WriteStatusProblem(w, http.StatusInternalServerError, "Logging in failed. Try again in a moment.")
		}

		return
	}

	if tokenType == "token" {
		var tokenRes struct {
			Token   string              `json:"token"`
			Type    string              `json:"type"`
			Expires database.TimeMillis `json:"expires"`
		}
		tokenRes.Token = token
		tokenRes.Type = "Bearer"
		tokenRes.Expires = database.TimeMillis(expires)
		api.WriteJSONObj(w, tokenRes)
	} else {
		auth.SetAuthToken(w, token, expires)
	}
}
