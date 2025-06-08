package api

import (
	"karopon/src/constants"
	"karopon/src/database"
	"net/http"
)

func GetSession(r *http.Request) (*database.TblUser, bool) {

	user, ok := r.Context().Value(constants.USER_CONTEXT_KEY).(*database.TblUser)

	return user, ok
}
