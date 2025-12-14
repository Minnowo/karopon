package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/config"
	"karopon/src/constants"
	"karopon/src/database"
	"net/http"
	"time"

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
		api.Unauthorized(w)
		return
	}

	var newUser UpdateUser

	err := json.NewDecoder(r.Body).Decode(&newUser)

	if err != nil {
		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	newUser.User.ID = user.ID
	newUser.User.Created = user.Created
	newUser.User.Password = user.Password

	if newUser.User.SessionExpireTimeSeconds <= 0 {
		// 50 years should be good enough for anyone
		newUser.User.SessionExpireTimeSeconds = int64(time.Hour * time.Duration(24*365*50))
	}

	if len(newUser.User.Name) > constants.MAX_USERNAME_LENGTH {
		api.BadReqf(w, "Username must be less than %d characters.", constants.MAX_USERNAME_LENGTH)
		return
	}

	if newUser.NewPassword != "" {

		if len(newUser.NewPassword) > constants.MAX_USER_PASSWORD_LENGTH {
			api.BadReqf(w, "The password is too long. It must be less than %d characters.", constants.MAX_USER_PASSWORD_LENGTH)
			return
		}
		if len(newUser.NewPassword) < constants.MIN_PASSWORD_LENGTH {
			api.BadReqf(w, "The password must be at least %d characters.", constants.MIN_PASSWORD_LENGTH)
			return
		}

		pass, err := bcrypt.GenerateFromPassword([]byte(newUser.NewPassword), bcrypt.DefaultCost)

		if err != nil {

			if err == bcrypt.ErrPasswordTooLong {
				api.BadReq(w, "The password is too long. It must be less than 72 characters.")
			} else {
				api.ServerErr(w, "Error while hashing the user password")
			}
			return
		}
		log.Debug().Str("name", user.Name).Msg("updating user password")

		newUser.User.Password = pass
	}

	if taken, err := a.Db.UsernameTaken(r.Context(), user.ID, newUser.User.Name); err != nil {
		log.Warn().Err(err).Int("userId", user.ID).Str("nameChecking", newUser.User.Name).Msg("Error checking if username exists")
		api.ServerErr(w, "Database error checking if username was taken.")
		return
	} else if taken {
		api.ServerErr(w, "The username is already taken by another user.")
		return
	}

	if err := a.Db.UpdateUser(r.Context(), &newUser.User); err != nil {
		log.Warn().Err(err).Int("userId", user.ID).Msg("Error while updating user")
		api.ServerErr(w, "Error while updating user.")
		return
	}

	a.UserReg.ReplaceUser(user.Name, &newUser.User)

	// debugging only
	if config.FakeAuth() {
		*user = newUser.User
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(newUser.User)
}
