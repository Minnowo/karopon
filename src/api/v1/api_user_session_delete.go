package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/api/userreg"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) deleteUserSession(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var req struct {
		TokenID string `json:"token_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		api.WriteUnreadableProblem(w)
		return
	}

	var hash userreg.AccessTokenHash

	if err := hash.FromString(req.TokenID); err != nil {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"This session could not be found. Reload the page and try again.",
		)

		return
	}

	if err := a.UserReg.ExpireSessionForUser(r.Context(), user.ID, hash); err != nil {

		log.Error().Err(err).Int("userID", user.ID).Msg("failed to delete user session")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "The session could not be logged out. Try again.")

		return
	}

	w.WriteHeader(http.StatusOK)
}
