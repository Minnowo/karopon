package v1

import (
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) getUserTimespansTagged(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var timespans []database.TaggedTimespan

	n, offset, err := parseListPage(r, user.TimespanHistoryFetchLimit)

	if err != nil {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"The request could not be read. Reload the page and try again.",
		)

		return
	}

	if err := a.Db.LoadUserTimespansWithTagsN(r.Context(), user.ID, n, offset, &timespans); err != nil {

		api.WriteStatusProblem(
			w,
			http.StatusInternalServerError,
			"Your timers could not be loaded. Reload the page to try again.",
		)
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Msg("Unexpected error reading a user's tags from the database")

		return
	}

	api.WriteJSONArr(w, timespans)
}
