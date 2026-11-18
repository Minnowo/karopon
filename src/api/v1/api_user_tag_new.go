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

func (a *APIV1) newUserTag(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var tag database.TblUserTag

	err := json.NewDecoder(r.Body).Decode(&tag)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)

		return
	}

	tag.Namespace = strings.TrimSpace(tag.Namespace)
	tag.Name = strings.TrimSpace(tag.Name)

	if errs := validateTagParts(tag.Namespace, tag.Name, "#/namespace", "#/name"); len(errs) > 0 {
		api.WriteValidationProblem(w, errs)
		return
	}

	tag.UserID = user.ID

	id, err := a.Db.AddUserTag(r.Context(), &tag)

	if errors.Is(err, database.ErrAlreadyExists) {
		api.WriteAlreadyExistsProblem(w, api.FieldProblem{
			Pointer: "#/name",
			Detail:  fmt.Sprintf("You already have a tag called %s:%s.", tag.Namespace, tag.Name),
		})

		return
	}

	if err != nil {

		api.WriteStatusProblem(w, http.StatusInternalServerError, "The tag could not be saved. Try again.")
		log.Error().
			Err(err).
			Int("userid", user.ID).
			Str("namespace", tag.Namespace).
			Str("name", tag.Name).
			Msg("Unexpected error adding a user's tag to the database")

		return
	}

	tag.ID = id

	api.WriteJSONObj(w, tag)
}
