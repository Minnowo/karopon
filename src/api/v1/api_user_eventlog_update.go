package v1

import (
	"encoding/json"
	"errors"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"
	"strings"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) updateUserEventFoodLog(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var ueflog database.UpdateUserEventLog

	err := json.NewDecoder(r.Body).Decode(&ueflog)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)

		return
	}

	if ueflog.Eventlog.ID <= 0 {
		api.WriteStatusProblem(
			w,
			http.StatusBadRequest,
			"This event could not be found. Reload the page and try again.",
		)

		return
	}

	ueflog.Eventlog.Event = strings.TrimSpace(ueflog.Eventlog.Event)

	var errs []api.FieldProblem

	if len(ueflog.Eventlog.Event) == 0 {
		errs = append(errs, api.FieldProblem{Pointer: "#/eventlog/event", Detail: "Enter a name for the event."})
	}

	errs = append(errs, validateFoodLogRows(ueflog.Foodlogs, "#/foodlogs")...)

	if len(errs) > 0 {
		api.WriteValidationProblem(w, errs)
		return
	}

	ueflog.Eventlog.UserID = user.ID

	err = a.Db.UpdateUserEventFoodLog(r.Context(), &ueflog)

	var rowErr *database.FoodLogRowError

	if errors.As(err, &rowErr) {
		writeFoodLogRowProblem(w, rowErr, "#/foodlogs")
		return
	}

	if err != nil {

		log.Warn().Err(err).Str("user", user.Name).Msg("failed to update user event log")
		api.WriteStatusProblem(w, http.StatusInternalServerError, "The event could not be saved. Try again.")

		return
	}

	out := database.UserEventFoodLog{
		Eventlog: ueflog.Eventlog,
		Foodlogs: ueflog.Foodlogs,
	}
	for _, foodlog := range ueflog.Foodlogs {
		out.TotalProtein += foodlog.Protein
		out.TotalCarb += foodlog.Carb
		out.TotalFibre += foodlog.Fibre
		out.TotalFat += foodlog.Fat
	}

	api.WriteJSONObj(w, out)
}
