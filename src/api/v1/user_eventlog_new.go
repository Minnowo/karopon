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
		api.BadReq(w, "no user session available")
		return
	}

	var event database.CreateUserEventLog

	err := json.NewDecoder(r.Body).Decode(&event)

	event.Event.Name = strings.TrimSpace(event.Event.Name)

	if err != nil {
		log.Debug().Err(err).Msg("invalid json")
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	if len(event.Event.Name) == 0 {
		http.Error(w, "event cannot have empty name", http.StatusBadRequest)
		return
	}

	event.Event.UserID = user.ID

	if err := a.Db.LoadUserEventByName(r.Context(), user.ID, event.Event.Name, &event.Event); err != nil {

		if !errors.Is(err, sql.ErrNoRows) {
			api.ServerErr(w, "Unexpected error reading from the database")
			log.Error().
				Err(err).
				Str("event", event.Event.Name).
				Int("userid", user.ID).
				Msg("Unexpected error reading the event from the database when trying to create a user event")
			return
		}

		id, err := a.Db.AddUserEvent(r.Context(), &event.Event)
		if err != nil {
			api.ServerErr(w, "Unexpected error adding the event to the database")
			log.Error().
				Err(err).
				Str("event", event.Event.Name).
				Int("userid", user.ID).
				Msg("Unexpected error writing the event from the database when trying to create a user event")
			return
		}

		event.Event.ID = id
	}

	for _, food := range event.Foods {
		food.Name = strings.TrimSpace(food.Name)
		food.Unit = strings.TrimSpace(food.Unit)
	}

	var userEventLog database.TblUserEventLog
	userEventLog.UserID = user.ID
	userEventLog.EventID = event.Event.ID
	userEventLog.Event = event.Event.Name
	if event.CreatedTime.Time().IsZero() {
		userEventLog.UserTime = database.UnixMillis(time.Now().UTC())
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
	if err != nil {
		api.ServerErr(w, "Unexpected error finalizing the event to the database")
		log.Error().
			Err(err).
			Str("event", event.Event.Name).
			Int("userid", user.ID).
			Msg("Unexpected error writing the event log to the database when trying to create a user event")
		return
	}

	var eventlogwithfoodlog database.UserEventFoodLog

	if err := a.Db.LoadUserEventFoodLog(r.Context(), user.ID, id, &eventlogwithfoodlog); err != nil {
		api.ServerErr(w, "The eventlog was created successfully! But, an unexpected error occurred reading it from the database.")
		log.Error().
			Err(err).
			Str("event", event.Event.Name).
			Int("userid", user.ID).
			Msg("The eventlog was created successfully! But, an unexpected error occurred reading it from the database.")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(eventlogwithfoodlog)
}
