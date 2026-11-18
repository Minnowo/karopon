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

func (a *APIV1) updateUserActivity(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var req database.UpdateUserActivityRequest

	err := json.NewDecoder(r.Body).Decode(&req)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)

		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.TagNamespace = strings.TrimSpace(req.TagNamespace)
	req.TagName = strings.TrimSpace(req.TagName)

	if req.ID <= 0 {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"This activity could not be found. Reload the page and try again.",
		)

		return
	}

	if errs := validateActivity(req.Name, req.TagNamespace, req.TagName, req.Duration); len(errs) > 0 {
		api.WriteValidationProblem(w, errs)
		return
	}

	tagID, err := a.Db.GetOrCreateUserTag(r.Context(), user.ID, req.TagNamespace, req.TagName)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to resolve tag for an activity")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "The activity could not be saved. Try again.")

		return
	}

	activity := database.TblUserActivity{
		ID:       req.ID,
		UserID:   user.ID,
		Name:     req.Name,
		TagID:    tagID,
		Duration: req.Duration,
		Note:     req.Note,
	}

	err = a.Db.UpdateUserActivity(r.Context(), &activity)

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to update activity")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "The activity could not be saved. Try again.")

		return
	}

	w.WriteHeader(http.StatusOK)
}
