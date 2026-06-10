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
		api.BadReq(w, "no user session available")
		return
	}

	var colors []database.TblUserTagColor

	if err := json.NewDecoder(r.Body).Decode(&colors); err != nil {
		api.BadReq(w, "invalid request body")
		return
	}

	for i := range colors {
		if colors[i].Namespace == "" {
			api.BadReq(w, "namespace must not be empty")
			return
		}

		if !isValidTagColor(colors[i].Color) {
			api.BadReq(w, "color must be a hex color (#RGB or #RRGGBB) or a CSS variable name (--name)")
			return
		}

		colors[i].UserID = user.ID
	}

	if err := a.Db.SetUserTagColors(r.Context(), colors); err != nil {
		log.Warn().Err(err).Str("user", user.Name).Msg("failed to set user tag color")
		api.ServerErr(w, "failed while writing to the database")
		return
	}

	w.WriteHeader(http.StatusOK)
}
