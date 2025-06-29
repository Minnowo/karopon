package v1

import (
	"karopon/src/api"
	"karopon/src/api/middleware"
	"karopon/src/constants"
	"net/http"
	"time"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) api_logout(w http.ResponseWriter, r *http.Request) {

	_, ok := api.GetSession(r)

	if ok {
		authToken, err := r.Cookie(middleware.SESSION_COOKIE)

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
		api.Done(w, http.StatusBadRequest, "failed to parse form")
		return
	}

	log.Info().Msg("handling login call")

	username := r.PostFormValue("pon_username")
	password := r.PostFormValue("pon_password")

	if username == "" || password == "" {
		api.Done(w, http.StatusBadRequest, "missing username or password")
		return
	}

	if len(username) > constants.MAX_USERNAME_LENGTH {
		api.BadReq(w, "username is too long")
		return
	}

	if len(password) > constants.MAX_USER_PASSWORD_LENGTH {
		api.BadReq(w, "password is too long")
		return
	}

	if !a.UserReg.HasUser(username) {
		api.Done(w, http.StatusUnauthorized, "username or password is incorrect")
		return
	}

	token, ok := a.UserReg.Login(username, password)

	if !ok {
		api.Done(w, http.StatusUnauthorized, "username or password is incorrect")
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
