package v1

import (
	"encoding/json"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"
	"regexp"

	"github.com/rs/zerolog/log"
)

var (
	reColorHex    = regexp.MustCompile(`^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$`)
	reColorCSSVar = regexp.MustCompile(`^--[a-zA-Z][a-zA-Z0-9-]*$`)
)

func isValidTagColor(color string) bool {
	return reColorHex.MatchString(color) || reColorCSSVar.MatchString(color)
}

func (a *APIV1) setUserTagColor(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var colors []database.TblUserTagColor

	if err := json.NewDecoder(r.Body).Decode(&colors); err != nil {
		api.WriteUnreadableProblem(w)
		return
	}

	for i := range colors {
		if colors[i].Namespace == "" {
			api.WriteStatusProblem(
				w,
				http.StatusBadRequest,
				"The request could not be read. Reload the page and try again.",
			)

			return
		}

		if !isValidTagColor(colors[i].Color) {
			api.WriteStatusProblem(
				w,
				http.StatusBadRequest,
				"Use a color like #ff8800 or a theme color like --primary.",
			)

			return
		}

		colors[i].UserID = user.ID
	}

	if err := a.Db.SetUserTagColors(r.Context(), colors); err != nil {
		log.Warn().Err(err).Str("user", user.Name).Msg("failed to set user tag color")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "The tag color could not be saved. Try again.")
		return
	}

	w.WriteHeader(http.StatusOK)
}
