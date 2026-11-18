package v1

import (
	"encoding/json"
	"errors"
	"fmt"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"
	"strings"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) createUserBodyMetric(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var metric database.TblUserBodyMetric

	err := json.NewDecoder(r.Body).Decode(&metric)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)

		return
	}

	metric.Name = strings.TrimSpace(metric.Name)
	metric.Unit = strings.TrimSpace(metric.Unit)

	if metric.Name == "" {
		api.WriteValidationProblem(
			w,
			[]api.FieldProblem{{Pointer: "#/name", Detail: "Enter a name for the body metric."}},
		)

		return
	}

	metric.UserID = user.ID

	id, err := a.Db.AddUserBodyMetric(r.Context(), &metric)

	if errors.Is(err, database.ErrAlreadyExists) {
		api.WriteAlreadyExistsProblem(w, api.FieldProblem{
			Pointer: "#/name",
			Detail:  fmt.Sprintf("You already have a body metric called %s. Use a different name.", metric.Name),
		})

		return
	}

	if err != nil {

		api.WriteStatusProblem(w, http.StatusInternalServerError, "The body metric could not be saved. Try again.")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Msg("Unexpected error adding a user's body metric to the database")

		return
	}

	metric.ID = id

	api.WriteJSONObj(w, metric)
}
