package postgres

import (
	"context"
	"karopon/src/database"
	"time"

	"github.com/jmoiron/sqlx"
)

func (db *PGDatabase) AddUserEventLogWith(ctx context.Context, event *database.TblUserEventLog, foodlogs []database.TblUserFoodLog) (int, error) {

	var retEventLogID int = -1

	err := db.WithTx(ctx, func(tx *sqlx.Tx) error {

		if time.Time(event.UserTime).IsZero() {
			event.UserTime = database.UnixMillis(time.Now())
		}
		eventLogID, err := db.AddUserEventLogTx(tx, event)

		if err != nil {
			return err
		}

		for _, food := range foodlogs {

			food.UserID = event.UserID
			food.Event = event.Event
			food.EventID = &event.EventID
			food.EventLogID = &eventLogID

			if time.Time(food.UserTime).IsZero() {
				food.UserTime = event.UserTime
			}

			id, err := db.AddUserFoodLogTx(tx, &food)

			if err != nil {
				return err
			}

			food.ID = id
		}

		retEventLogID = eventLogID

		return nil
	})

	return retEventLogID, err

}

func (db *PGDatabase) AddUserEventLogTx(tx *sqlx.Tx, event *database.TblUserEventLog) (int, error) {

	query := `
		INSERT INTO PON.USER_EVENTLOG (
			USER_ID,
			EVENT_ID,
			USER_TIME,
			EVENT,
			NET_CARBS,
			BLOOD_GLUCOSE,
			INSULIN_SENSITIVITY_FACTOR,
			INSULIN_TO_CARB_RATIO,
			BLOOD_GLUCOSE_TARGET,
			RECOMMENDED_INSULIN_AMOUNT,
			ACTUAL_INSULIN_TAKEN
		)
		VALUES(:user_id, :event_id, :user_time, :event, :net_carbs, 
			:blood_glucose,
			:insulin_sensitivity_factor,
			:insulin_to_carb_ratio,
			:blood_glucose_target,
			:recommended_insulin_amount,
			:actual_insulin_taken
		)
		RETURNING ID;
	`

	id, err := db.InsertOneNamedGetIDTx(tx, query, event)

	return id, err
}
