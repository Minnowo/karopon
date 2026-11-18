package v1

import (
	"database/sql"
	"encoding/json"
	"errors"
	"karopon/src/api"
	"karopon/src/api/auth"
	"karopon/src/database"
	"net/http"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

func (a *APIV1) createUserEvent(w http.ResponseWriter, r *http.Request) {

	user := auth.GetUser(r)

	if user == nil {
		api.WriteNoUserProblem(w)
		return
	}

	var event database.CreateUserEventLog

	err := json.NewDecoder(r.Body).Decode(&event)

	if err != nil {

		log.Debug().Err(err).Msg("invalid json")
		api.WriteUnreadableProblem(w)

		return
	}

	event.Event.Name = strings.TrimSpace(event.Event.Name)

	var errs []api.FieldProblem

	if len(event.Event.Name) == 0 {
		errs = append(errs, api.FieldProblem{Pointer: "#/event/name", Detail: "Enter a name for the event."})
	}

	errs = append(errs, validateFoodLogRows(event.Foods, "#/foods")...)

	if len(errs) > 0 {
		api.WriteValidationProblem(w, errs)
		return
	}

	event.Event.UserID = user.ID

	if err := a.Db.LoadUserEventByName(r.Context(), user.ID, event.Event.Name, &event.Event); err != nil {

		if !errors.Is(err, sql.ErrNoRows) {

			api.WriteStatusProblem(w, http.StatusInternalServerError, "The event could not be saved. Try again.")
			log.Error().
				Err(err).
				Str("event", event.Event.Name).
				Int("userid", user.ID).
				Msg("Unexpected error reading the event from the database when trying to create a user event")

			return
		}

		id, err := a.Db.AddUserEvent(r.Context(), &event.Event)
		if err != nil {

			api.WriteStatusProblem(w, http.StatusInternalServerError, "The event could not be saved. Try again.")
			log.Error().
				Err(err).
				Str("event", event.Event.Name).
				Int("userid", user.ID).
				Msg("Unexpected error writing the event from the database when trying to create a user event")

			return
		}

		event.Event.ID = id
	}

	var userEventLog database.TblUserEventLog
	userEventLog.UserID = user.ID
	userEventLog.EventID = event.Event.ID
	userEventLog.Event = event.Event.Name
	if event.CreatedTime.Time().IsZero() {
		userEventLog.UserTime = database.TimeMillis(time.Now().UTC())
	} else {
		userEventLog.UserTime = event.CreatedTime
	}
	userEventLog.BloodGlucose = event.BloodGlucose
	userEventLog.BloodGlucoseTarget = event.BloodGlucoseTarget
	userEventLog.InsulinSensitivityFactor = event.InsulinSensitivityFactor
	userEventLog.InsulinToCarbRatio = event.InsulinToCarbRatio
	userEventLog.ActualInsulinTaken = event.ActualInsulinTaken
	userEventLog.RecommendedInsulinAmount = event.RecommendedInsulinAmount

	id, err := a.Db.AddUserEventLogWith(r.Context(), &userEventLog, event.Foods)

	var rowErr *database.FoodLogRowError

	if errors.As(err, &rowErr) {
		writeFoodLogRowProblem(w, rowErr, "#/foods")
		return
	}

	if err != nil {

		api.WriteStatusProblem(w, http.StatusInternalServerError, "The event could not be saved. Try again.")
		log.Error().
			Err(err).
			Str("event", event.Event.Name).
			Int("userid", user.ID).
			Msg("Unexpected error writing the event log to the database when trying to create a user event")

		return
	}

	var eventlogwithfoodlog database.UserEventFoodLog

	if err := a.Db.LoadUserEventFoodLog(r.Context(), user.ID, id, &eventlogwithfoodlog); err != nil {

		api.WriteStatusProblem(
			w,
			http.StatusInternalServerError,
			"The event was saved, but could not be loaded back. Reload the page to see it.",
		)

		log.Error().
			Err(err).
			Str("event", event.Event.Name).
			Int("userid", user.ID).
			Msg("The eventlog was created successfully! But, an unexpected error occurred reading it from the database.")

		return
	}

	api.WriteJSONObj(w, eventlogwithfoodlog)
}
