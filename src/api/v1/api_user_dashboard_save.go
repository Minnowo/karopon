package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"
	"strings"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) newUserDashboard(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var dashboard database.TblUserDashboard

	if err := json.NewDecoder(r.Body).Decode(&dashboard); err != nil {
		api.WriteUnreadableProblem(w)
		return
	}

	dashboard.UserID = user.ID
	dashboard.Name = strings.TrimSpace(dashboard.Name)

	if dashboard.Name == "" {
		writeDashboardNameProblem(w)
		return
	}

	id, err := a.Db.AddUserDashboard(r.Context(), &dashboard)

	if err != nil {
		log.Warn().Err(err).Str("user", user.Name).Msg("failed to create user dashboard")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "The dashboard could not be saved. Try again.")
		return
	}

	dashboard.ID = id

	api.WriteJSONObj(w, dashboard)
}

func (a *APIV1) updateUserDashboard(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var dashboard database.TblUserDashboard

	if err := json.NewDecoder(r.Body).Decode(&dashboard); err != nil {
		api.WriteUnreadableProblem(w)
		return
	}

	dashboard.UserID = user.ID
	dashboard.Name = strings.TrimSpace(dashboard.Name)

	if dashboard.Name == "" {
		writeDashboardNameProblem(w)
		return
	}

	if err := a.Db.UpdateUserDashboard(r.Context(), &dashboard); err != nil {
		log.Warn().Err(err).Str("user", user.Name).Msg("failed to update user dashboard")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "The dashboard could not be saved. Try again.")
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (a *APIV1) deleteUserDashboard(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var req struct {
		ID int `json:"id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		api.WriteUnreadableProblem(w)
		return
	}

	if err := a.Db.DeleteUserDashboard(r.Context(), user.ID, req.ID); err != nil {
		log.Warn().Err(err).Str("user", user.Name).Msg("failed to delete user dashboard")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "The dashboard could not be deleted. Try again.")
		return
	}

	w.WriteHeader(http.StatusOK)
}

// writeDashboardNameProblem answers a dashboard (a view) saved without a name.
func writeDashboardNameProblem(w http.ResponseWriter) {
	api.WriteValidationProblem(w, []api.FieldProblem{{Pointer: "#/name", Detail: "Enter a name for the view."}})
}
