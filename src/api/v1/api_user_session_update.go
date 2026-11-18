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
		api.WriteNoUserProblem(w)
		return
	}

	var req struct {
		TokenID   string `json:"token_id"`
		UserAgent string `json:"user_agent"`
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

	userAgent := strings.TrimSpace(req.UserAgent)

	if userAgent == "" {
		api.WriteValidationProblem(
			w,
			[]api.FieldProblem{{Pointer: "#/user_agent", Detail: "Enter a name for this session."}},
		)

		return
	}

	if err := a.Db.UpdateUserSessionUserAgent(r.Context(), user.ID, hash[:], userAgent); err != nil {
		log.Error().Err(err).Int("userID", user.ID).Msg("failed to update user session")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "The session could not be renamed. Try again.")
		return
	}

	w.WriteHeader(http.StatusOK)
}
