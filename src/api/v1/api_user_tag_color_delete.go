package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) deleteUserTagColor(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var req struct {
		Namespace []string `json:"namespace"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		api.WriteUnreadableProblem(w)
		return
	}

	if len(req.Namespace) == 0 {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"The request could not be read. Reload the page and try again.",
		)

		return
	}

	for i := range len(req.Namespace) {

		if req.Namespace[i] == "" {
			api.WriteStatusProblem(
				w,
				http.StatusBadRequest,
				"The request could not be read. Reload the page and try again.",
			)

			return
		}
	}

	if err := a.Db.DeleteUserTagColors(r.Context(), user.ID, req.Namespace); err != nil {
		log.Warn().Err(err).Str("user", user.Name).Msg("failed to delete user tag color")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "The tag color could not be removed. Try again.")
		return
	}

	w.WriteHeader(http.StatusOK)
}
