package v1

import (
	"encoding/json"
	"fmt"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/constants"
	"karopon/src/database"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/rs/zerolog/log"
	"golang.org/x/crypto/bcrypt"
)

type UpdateUser struct {
	User        database.TblUser `json:"user"`
	NewPassword string           `json:"new_password"`
}

func (a *APIV1) updateUser(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var newUser UpdateUser

	err := json.NewDecoder(r.Body).Decode(&newUser)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)

		return
	}

	newUser.User.ID = user.ID
	newUser.User.Created = user.Created
	newUser.User.Password = user.Password

	if newUser.User.SessionExpireTimeSeconds <= 0 {
		// 1 years should be good enough
		newUser.User.SessionExpireTimeSeconds = int64(time.Hour * time.Duration(24*365*1))
	}

	newUser.User.Name = strings.TrimSpace(newUser.User.Name)

	if newUser.User.MiscSettings == "" {
		newUser.User.MiscSettings = "{}"
	}

	// Misc settings are written by the app, not typed by the user, so a bad blob means a stale page.
	if len(newUser.User.MiscSettings) > constants.MAX_MISC_SETTINGS_SIZE ||
		!json.Valid([]byte(newUser.User.MiscSettings)) {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"Your settings could not be read. Reload the page and try again.",
		)

		return
	}

	var errs []api.FieldProblem

	switch {
	case len(newUser.User.Name) == 0:
		errs = append(errs, api.FieldProblem{Pointer: "#/user/name", Detail: "Enter a user name."})
	case utf8.RuneCountInString(newUser.User.Name) > constants.MAX_USERNAME_LENGTH:
		errs = append(errs, api.FieldProblem{
			Pointer: "#/user/name",
			Detail:  fmt.Sprintf("Use a user name of at most %d characters.", constants.MAX_USERNAME_LENGTH),
		})
	}

	if len(newUser.User.CustomCSS) > constants.MAX_CUSTOM_CSS_SIZE {
		errs = append(errs, api.FieldProblem{
			Pointer: "#/user/custom_css",
			Detail:  fmt.Sprintf("Keep custom CSS under %d KB.", constants.MAX_CUSTOM_CSS_SIZE/constants.KB),
		})
	}

	// An empty new password means "keep the current one".
	if newUser.NewPassword != "" {
		switch {
		case len(newUser.NewPassword) > constants.MAX_USER_PASSWORD_LENGTH:
			errs = append(errs, api.FieldProblem{
				Pointer: "#/new_password",
				Detail: fmt.Sprintf(
					"Use a shorter password: at most %d bytes (letters outside A-Z can take up to 4 bytes each).",
					constants.MAX_USER_PASSWORD_LENGTH,
				),
			})
		case len(newUser.NewPassword) < constants.MIN_PASSWORD_LENGTH:
			errs = append(errs, api.FieldProblem{
				Pointer: "#/new_password",
				Detail:  fmt.Sprintf("Use a password of at least %d characters.", constants.MIN_PASSWORD_LENGTH),
			})
		}
	}

	// The name is only looked up when it is otherwise fine, and a taken name is reported with the
	// other field problems, so the user sees everything at once.
	nameTaken := false

	if len(newUser.User.Name) > 0 && utf8.RuneCountInString(newUser.User.Name) <= constants.MAX_USERNAME_LENGTH {

		taken, err := a.Db.UsernameTaken(r.Context(), user.ID, newUser.User.Name)

		if err != nil {

			log.Warn().
				Err(err).
				Int("userID", user.ID).
				Str("nameChecking", newUser.User.Name).
				Msg("Error checking if username exists")
			api.WriteStatusProblem(w, http.StatusInternalServerError, "Your settings could not be saved. Try again.")

			return
		}

		nameTaken = taken
	}

	takenProblem := api.FieldProblem{Pointer: "#/user/name", Detail: "That user name is taken. Choose another one."}

	if nameTaken && len(errs) == 0 {
		api.WriteAlreadyExistsProblem(w, takenProblem)
		return
	}

	if nameTaken {
		errs = append([]api.FieldProblem{takenProblem}, errs...)
	}

	if len(errs) > 0 {
		api.WriteValidationProblem(w, errs)
		return
	}

	if newUser.NewPassword != "" {

		pass, err := bcrypt.GenerateFromPassword([]byte(newUser.NewPassword), bcrypt.DefaultCost)

		if err != nil {

			log.Warn().Err(err).Int("userID", user.ID).Msg("Error hashing the new password")
			api.WriteStatusProblem(w, http.StatusInternalServerError, "The password could not be changed. Try again.")

			return
		}
		log.Debug().Str("name", user.Name).Msg("updating user password")

		newUser.User.Password = pass
	}

	if err := a.Db.UpdateUser(r.Context(), &newUser.User); err != nil {

		log.Warn().Err(err).Int("userID", user.ID).Msg("Error while updating user")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "Your settings could not be saved. Try again.")

		return
	}

	a.UserReg.PutUserWithNewName(user.Name, &newUser.User)

	api.WriteJSONObj(w, newUser.User)
}
