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

		event.NetCarbs = 0

		for _, food := range foodlogs {
			event.NetCarbs += food.Carb - food.Fibre
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
			food.UserTime = event.UserTime

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

func (db *PGDatabase) LoadUserEventFoodLog(ctx context.Context, userId int, eventlogId int, eventWithFood *database.UserEventFoodLog) error {

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		var eventlog database.TblUserEventLog

		if err := db.LoadUserEventLogTx(tx, userId, eventlogId, &eventlog); err != nil {
			return err
		}

		var eventlogWithFood database.UserEventFoodLog

		if err := db.LoadUserFoodLogByEventLogTx(tx, userId, eventlogId, &eventlogWithFood.Foodlogs); err != nil {
			return err
		}

		eventlogWithFood.Eventlog = eventlog

		for _, foodlog := range eventlogWithFood.Foodlogs {
			eventlogWithFood.TotalCarb += foodlog.Carb
			eventlogWithFood.TotalProtein += foodlog.Protein
			eventlogWithFood.TotalFat += foodlog.Fat
			eventlogWithFood.TotalFibre += foodlog.Fibre
		}
		if eventlogWithFood.Foodlogs == nil {
			eventlogWithFood.Foodlogs = make([]database.TblUserFoodLog, 0)
		}

		*eventWithFood = eventlogWithFood

		return nil
	})
}

func (db *PGDatabase) LoadUserEventFoodLogsN(ctx context.Context, userId int, n int, eventWithFood *[]database.UserEventFoodLog) error {

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		var eventlogs []database.TblUserEventLog

		if err := db.LoadUserEventLogsNTx(tx, userId, n, &eventlogs); err != nil {
			return err
		}

		eventlogsWithFood := make([]database.UserEventFoodLog, len(eventlogs))

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

func (db *PGDatabase) LoadUserEventFoodFoodLogs(ctx context.Context, userId int, eventWithFood *[]database.UserEventFoodLog) error {
	return db.LoadUserEventFoodLogsN(ctx, userId, -1, eventWithFood)
}

func (db *PGDatabase) LoadUserEventLogs(ctx context.Context, userId int, out *[]database.TblUserEventLog) error {
	return db.WithTx(ctx, func(tx *sqlx.Tx) error {
		return db.LoadUserEventLogsTx(tx, userId, out)
	})
}

func (db *PGDatabase) LoadUserEventLogsNTx(tx *sqlx.Tx, userId int, n int, out *[]database.TblUserEventLog) error {
	query := `
		SELECT * FROM PON.USER_EVENTLOG el
		WHERE el.USER_ID = $1
		ORDER BY el.USER_TIME DESC
		LIMIT $2
	`
	return tx.Select(out, query, userId, n)
}

func (db *PGDatabase) LoadUserEventLogsTx(tx *sqlx.Tx, userId int, out *[]database.TblUserEventLog) error {
	query := `
		SELECT * FROM PON.USER_EVENTLOG el
		WHERE el.USER_ID = $1
		ORDER BY el.USER_TIME DESC
	`
	return tx.Select(out, query, userId)
}

func (db *PGDatabase) LoadUserEventLogTx(tx *sqlx.Tx, userId int, eventlogId int, out *database.TblUserEventLog) error {
	query := `
		SELECT * FROM PON.USER_EVENTLOG el
		WHERE el.USER_ID = $1 AND el.ID = $2
	`
	return tx.Get(out, query, userId, eventlogId)
}

func (db *PGDatabase) UpdateUserEventFoodLog(ctx context.Context, eventlog *database.UpdateUserEventLog) error {

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		var err error

		_, err = tx.Exec(`DELETE FROM PON.USER_FOODLOG WHERE USER_ID = $1 AND EVENTLOG_ID = $2`, eventlog.Eventlog.UserID, eventlog.Eventlog.ID)

		if err != nil {
			return err
		}

		if eventlog.Eventlog.UserTime.Time().IsZero() {
			eventlog.Eventlog.UserTime = database.UnixMillis(time.Now().UTC())
		}

		{ // if the user changed the name of the event
			var event database.TblUserEvent

			if err = db.LoadAndOrCreateUserEventByNameTx(tx, eventlog.Eventlog.UserID, eventlog.Eventlog.Event, &event); err != nil {
				return err
			}

			eventlog.Eventlog.EventID = event.ID
		}

		eventlog.Eventlog.NetCarbs = 0

		for _, food := range eventlog.Foodlogs {

			eventlog.Eventlog.NetCarbs = food.Carb - food.Fibre

			food.UserID = eventlog.Eventlog.UserID
			food.UserTime = eventlog.Eventlog.UserTime
			food.Event = eventlog.Eventlog.Event
			food.EventID = &eventlog.Eventlog.EventID
			food.EventLogID = &eventlog.Eventlog.ID

			id, err := db.AddUserFoodLogTx(tx, &food)

			if err != nil {
				return err
			}

			food.ID = id
		}

		query := `UPDATE PON.USER_EVENTLOG SET ` +
			`EVENT_ID  					= :event_id,` +
			`USER_TIME					= :user_time,` +
			`EVENT						= :event,` +
			`NET_CARBS					= :net_carbs,` +
			`BLOOD_GLUCOSE				= :blood_glucose,` +
			`INSULIN_SENSITIVITY_FACTOR	= :insulin_sensitivity_factor,` +
			`INSULIN_TO_CARB_RATIO		= :insulin_to_carb_ratio,` +
			`BLOOD_GLUCOSE_TARGET		= :blood_glucose_target,` +
			`RECOMMENDED_INSULIN_AMOUNT	= :recommended_insulin_amount,` +
			`ACTUAL_INSULIN_TAKEN		= :actual_insulin_taken ` +
			`WHERE USER_ID = :user_id AND ID = :id`

		_, err = db.NamedExecContext(ctx, query, eventlog.Eventlog)

		return err

	})
}

func (db *PGDatabase) DeleteUserEventLog(ctx context.Context, userId int, eventlogId int, deleteFoodLogs bool) error {

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		var err error

		if deleteFoodLogs {

			_, err = tx.Exec(`DELETE FROM PON.USER_FOODLOG WHERE USER_ID = $1 AND EVENTLOG_ID = $2`, userId, eventlogId)

			if err != nil {
				return err
			}
		} else {

			_, err = tx.Exec(`UPDATE PON.USER_FOODLOG SET EVENTLOG_ID = null WHERE USER_ID = $1 AND EVENTLOG_ID = $2`, userId, eventlogId)

			if err != nil {
				return err
			}
		}

		_, err = tx.Exec(`DELETE FROM PON.USER_EVENTLOG WHERE USER_ID = $1 AND ID = $2`, userId, eventlogId)

		return err
	})
}
