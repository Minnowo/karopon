package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/api/userreg"
	"net/http"
	"strings"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) updateUserSession(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.Unauthorized(w)
		return
	}

	var req struct {
		TokenID   string `json:"token_id"`
		UserAgent string `json:"user_agent"`
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

	userAgent := strings.TrimSpace(req.UserAgent)

	if userAgent == "" {
		api.BadReq(w, "user_agent must not be empty")
		return
	}

	if err := a.Db.UpdateUserSessionUserAgent(r.Context(), user.ID, hash[:], userAgent); err != nil {
		log.Error().Err(err).Int("userID", user.ID).Msg("failed to update user session")
		api.ServerErr(w, "failed to update session")
		return
	}

	w.WriteHeader(http.StatusOK)
}
