package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/constants"
	"karopon/src/database"
	"net/http"
	"strings"

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

	if err := r.ParseMultipartForm(constants.MAX_LOGIN_FORM_SIZE); err != nil {
		log.Debug().Err(err).Msg("failed to get multipartReader")
		api.BadReqf(w, "Failed to parse the given form data, the size must be less than %d bytes.", constants.MAX_LOGIN_FORM_SIZE)
		return
	}

	username := strings.TrimSpace(r.PostFormValue("pon_username"))
	password := r.PostFormValue("pon_password")
	tokenType := r.PostFormValue("pon_token_type")

	log.Info().Str("username", username).Str("tokenType", tokenType).Msg("Handling login call")

	if username == "" || password == "" {
		api.BadReq(w, "The username or password cannot be empty.")
		return
	}

	if len(username) > constants.MAX_USERNAME_LENGTH {
		api.BadReqf(w, "Username is too long, it should be less than %d characters.", constants.MAX_USERNAME_LENGTH)
		return
	}

	if len(password) < constants.MIN_PASSWORD_LENGTH {
		api.BadReqf(w, "Password is too short, it should be longer than %d characters.", constants.MIN_PASSWORD_LENGTH)
		return
	}

	if len(password) > constants.MAX_USER_PASSWORD_LENGTH {
		api.BadReqf(w, "Password is too long, it should be shorter than %d characters.", constants.MAX_USER_PASSWORD_LENGTH)
		return
	}

	if !a.UserReg.HasUser(username) {
		api.Done(w, http.StatusUnauthorized, "The username or password is incorrect.")
		return
	}

	token, expires, ok := a.UserReg.Login(username, password)

	if !ok {
		api.Done(w, http.StatusUnauthorized, "The username or password is incorrect.")
		return
	}

	if tokenType == "token" {
		var tokenRes struct {
			Token   string              `json:"token"`
			Expires database.TimeMillis `json:"expires"`
		}
		tokenRes.Token = token
		tokenRes.Expires = database.TimeMillis(expires)
		json.NewEncoder(w).Encode(tokenRes)
	} else {
		auth.SetAuthToken(w, token, expires)
	}
}
