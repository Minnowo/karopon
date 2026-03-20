package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) newUserDashboard(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var dashboard database.TblUserDashboard

	if err := json.NewDecoder(r.Body).Decode(&dashboard); err != nil {
		api.BadReq(w, "invalid request body")
		return
	}

	dashboard.UserID = user.ID

	id, err := a.Db.AddUserDashboard(r.Context(), &dashboard)

	if err != nil {
		log.Warn().Err(err).Str("user", user.Name).Msg("failed to create user dashboard")
		api.ServerErr(w, "failed while writing to the database")
		return
	}

	dashboard.ID = id

	api.WriteJSONObj(w, dashboard)
}

func (a *APIV1) updateUserDashboard(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var dashboard database.TblUserDashboard

	if err := json.NewDecoder(r.Body).Decode(&dashboard); err != nil {
		api.BadReq(w, "invalid request body")
		return
	}

	dashboard.UserID = user.ID

	if err := a.Db.UpdateUserDashboard(r.Context(), &dashboard); err != nil {
		log.Warn().Err(err).Str("user", user.Name).Msg("failed to update user dashboard")
		api.ServerErr(w, "failed while writing to the database")
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (a *APIV1) deleteUserDashboard(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var req struct {
		ID int `json:"id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		api.BadReq(w, "invalid request body")
		return
	}

	if err := a.Db.DeleteUserDashboard(r.Context(), user.ID, req.ID); err != nil {
		log.Warn().Err(err).Str("user", user.Name).Msg("failed to delete user dashboard")
		api.ServerErr(w, "failed while writing to the database")
		return
	}

	w.WriteHeader(http.StatusOK)
}
