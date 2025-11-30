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

func (db *PGDatabase) LoadUserEventLogsWithFoodLog(ctx context.Context, userId int, eventWithFood *[]database.UserEventLogWithFoodLog) error {

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		var eventlogs []database.TblUserEventLog

		if err := db.LoadUserEventLogsTx(tx, userId, &eventlogs); err != nil {
			return err
		}

		eventlogsWithFood := make([]database.UserEventLogWithFoodLog, len(eventlogs))

		for i, eventlog := range eventlogs {

			ewfood := &eventlogsWithFood[i]

			if err := db.LoadUserFoodLogByEventLogTx(tx, userId, eventlog.ID, &ewfood.Foodlogs); err != nil {
				return err
			}

			ewfood.Eventlog = eventlog

			for _, foodlog := range ewfood.Foodlogs {
				ewfood.TotalCarb += foodlog.Carb
				ewfood.TotalProtein += foodlog.Protein
				ewfood.TotalFat += foodlog.Fat
				ewfood.TotalFibre += foodlog.Fibre
			}
			if ewfood.Foodlogs == nil {
				ewfood.Foodlogs = make([]database.TblUserFoodLog, 0)
			}
		}

		*eventWithFood = eventlogsWithFood

		return nil
	})
}

func (db *PGDatabase) LoadUserEventLogs(ctx context.Context, userId int, out *[]database.TblUserEventLog) error {
	return db.WithTx(ctx, func(tx *sqlx.Tx) error {
		return db.LoadUserEventLogsTx(tx, userId, out)
	})
}

func (db *PGDatabase) LoadUserEventLogsTx(tx *sqlx.Tx, userId int, out *[]database.TblUserEventLog) error {
	query := `
		SELECT * FROM PON.USER_EVENTLOG el
		WHERE el.USER_ID = $1
		ORDER BY el.CREATED DESC
	`
	return tx.Select(out, query, userId)
}

func (db *PGDatabase) UpdateUserEventLog(ctx context.Context, eventlog *database.TblUserEventLog) error {

	query := `
		UPDATE PON.USER_EVENTLOG
		SET
			USER_ID						= :user_id,
			EVENT_ID  					= :event_id,
			USER_TIME					= :user_time,
			EVENT						= :event,
			NET_CARBS					= :net_carbs,
			BLOOD_GLUCOSE				= :blood_glucose,
			INSULIN_SENSITIVITY_FACTOR	= :insulin_sensitivity_factor,
			INSULIN_TO_CARB_RATIO		= :insulin_to_carb_ratio,
			BLOOD_GLUCOSE_TARGET		= :blood_glucose_target,
			RECOMMENDED_INSULIN_AMOUNT	= :recommended_insulin_amount,
			ACTUAL_INSULIN_TAKEN		= :actual_insulin_taken
		WHERE USER_ID = :user_id AND ID = :id 
    `

	_, err := db.NamedExecContext(ctx, query, eventlog)

	return err
}
