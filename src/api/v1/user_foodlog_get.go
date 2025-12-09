package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) get_userfoodlog(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var foodlog []database.TblUserFoodLog

	err := a.Db.LoadUserFoodLogs(r.Context(), user.ID, &foodlog)

	if err != nil {
		log.Warn().Err(err).Str("user", user.Name).Msg("failed to read user food log")
		api.ServerErr(w, "failed while reading from the database")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	if len(foodlog) == 0 {
		w.Write([]byte("[]"))
	} else {
		json.NewEncoder(w).Encode(foodlog)
	}
}
