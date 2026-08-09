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

func (a *APIV1) addUserActivity(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.BadReq(w, "no user session available")
		return
	}

	var req database.NewUserActivityRequest

	err := json.NewDecoder(r.Body).Decode(&req)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)

		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.TagNamespace = strings.TrimSpace(req.TagNamespace)
	req.TagName = strings.TrimSpace(req.TagName)

	if len(req.Name) == 0 {
		http.Error(w, "activity cannot have empty name", http.StatusBadRequest)
		return
	}

	if len(req.TagNamespace) == 0 || len(req.TagName) == 0 {
		http.Error(w, "activity must have a tag", http.StatusBadRequest)
		return
	}

	if req.Duration <= 0 {
		http.Error(w, "duration cannot be <= 0", http.StatusBadRequest)
		return
	}

	tagID, err := a.Db.GetOrCreateUserTag(r.Context(), user.ID, req.TagNamespace, req.TagName)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to resolve tag for a new activity")
		api.ServerErr(w, "failed to create the activity in the database")

		return
	}

	activity := database.TblUserActivity{
		ID:       -1,
		UserID:   user.ID,
		Name:     req.Name,
		TagID:    tagID,
		Duration: req.Duration,
		Note:     req.Note,
	}

	newID, err := a.Db.AddUserActivity(r.Context(), &activity)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to create a new activity")
		api.ServerErr(w, "failed to create the activity in the database")

		return
	}

	activity.ID = newID

	api.WriteJSONObj(w, activity)
}
