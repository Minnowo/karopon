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
		api.Unauthorized(w)
		return
	}

	var req struct {
		TokenID string `json:"token_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		api.BadReq(w, "invalid JSON")
		return
	}

	var hash userreg.AccessTokenHash

	if err := hash.FromString(req.TokenID); err != nil {
		api.BadReq(w, "invalid token_id")
		return
	}

	if err := a.UserReg.ExpireSessionForUser(r.Context(), user.ID, hash); err != nil {

		log.Error().Err(err).Int("userID", user.ID).Msg("failed to delete user session")
		api.ServerErr(w, "failed to delete session")

		return
	}

	w.WriteHeader(http.StatusOK)
}
