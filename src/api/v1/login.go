package v1

import (
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/constants"
	"net/http"
	"time"

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

	http.SetCookie(w, &http.Cookie{
		Path:     "/",
		Name:     constants.SESSION_COOKIE,
		Value:    "",
		MaxAge:   -1,
		Secure:   true,
		HttpOnly: true,
	})
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func (a *APIV1) api_login(w http.ResponseWriter, r *http.Request) {

	r.Body = http.MaxBytesReader(w, r.Body, constants.MAX_LOGIN_FORM_SIZE)

	if err := r.ParseMultipartForm(constants.MAX_LOGIN_FORM_SIZE); err != nil {
		log.Debug().Err(err).Msg("failed to get multipartReader")
		api.BadReqf(w, "Failed to parse the given form data, the size must be less than %d bytes.", constants.MAX_LOGIN_FORM_SIZE)
		return
	}

	log.Info().Msg("handling login call")

	username := r.PostFormValue("pon_username")
	password := r.PostFormValue("pon_password")

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

	token, ok := a.UserReg.Login(username, password)

	if !ok {
		api.Done(w, http.StatusUnauthorized, "The username or password is incorrect.")
		return
	}

	http.SetCookie(w, &http.Cookie{
		Path:    "/",
		Name:    constants.SESSION_COOKIE,
		Value:   token,
		Expires: time.Now().Add(time.Hour * 24),
		// Secure:   true,
		HttpOnly: true,
	})

	http.Redirect(w, r, "/", http.StatusSeeOther)
}
