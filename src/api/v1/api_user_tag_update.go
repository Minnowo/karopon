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

type updateUserTagRequest struct {
	Namespace    string `json:"namespace"`
	Name         string `json:"name"`
	NewNamespace string `json:"new_namespace"`
	NewName      string `json:"new_name"`

	// Merge, if true and a tag already exists at (NewNamespace, NewName),
	// reassigns all usages of the renamed tag onto the existing tag and deletes it,
	// instead of failing with a conflict.
	Merge bool `json:"merge"`
}

func (a *APIV1) updateUserTag(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var req updateUserTagRequest

	err := json.NewDecoder(r.Body).Decode(&req)

	if err != nil {
		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)
		return
	}

	req.Namespace = strings.TrimSpace(req.Namespace)
	req.Name = strings.TrimSpace(req.Name)
	req.NewNamespace = strings.TrimSpace(req.NewNamespace)
	req.NewName = strings.TrimSpace(req.NewName)

	if req.Namespace == "" || req.Name == "" {
		api.WriteStatusProblem(w, http.StatusBadRequest, "This tag could not be found. Reload the page and try again.")
		return
	}

	if errs := validateTagParts(req.NewNamespace, req.NewName, "#/new_namespace", "#/new_name"); len(errs) > 0 {
		api.WriteValidationProblem(w, errs)
		return
	}

	if req.Namespace == req.NewNamespace && req.Name == req.NewName {
		api.WriteValidationProblem(w, []api.FieldProblem{{
			Pointer: "#/new_name",
			Detail:  "Change the namespace or the name to rename the tag.",
		}})

		return
	}

	err = a.Db.UpdateUserTag(r.Context(), user.ID, req.Namespace, req.Name, req.NewNamespace, req.NewName, req.Merge)

	if errors.Is(err, database.ErrTagAlreadyExists) {
		api.WriteAlreadyExistsProblem(w, api.FieldProblem{
			Pointer: "#/new_name",
			Detail: fmt.Sprintf(
				"You already have a tag called %s:%s. Tick merge to combine the two tags.",
				req.NewNamespace,
				req.NewName,
			),
		})

		return
	}

	if err != nil {

		log.Warn().
			Err(err).
			Str("user", user.Name).
			Str("namespace", req.Namespace).
			Str("name", req.Name).
			Msg("failed to update tag")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "The tag could not be saved. Try again.")

		return
	}

	w.WriteHeader(http.StatusOK)
}
