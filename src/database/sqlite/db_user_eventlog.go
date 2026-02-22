package sqlite

import (
	"context"
	"io"
	"karopon/src/database"
	"time"

	"github.com/vinovest/sqlx"
)

func (db *SqliteDatabase) AddUserEventLogWith(
	ctx context.Context,
	event *database.TblUserEventLog,
	foodlogs []database.TblUserFoodLog,
) (int, error) {

	var retEventLogID int = -1

	err := db.WithTx(ctx, func(tx *sqlx.Tx) error {

		if time.Time(event.UserTime).IsZero() {
			event.UserTime = database.TimeMillis(time.Now())
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

func (db *SqliteDatabase) AddUserEventLogTx(tx *sqlx.Tx, event *database.TblUserEventLog) (int, error) {

	query := `
		INSERT INTO PON_USER_EVENTLOG (
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
		VALUES(:USER_ID, :EVENT_ID, :USER_TIME, :EVENT, :NET_CARBS, 
			:BLOOD_GLUCOSE,
			:INSULIN_SENSITIVITY_FACTOR,
			:INSULIN_TO_CARB_RATIO,
			:BLOOD_GLUCOSE_TARGET,
			:RECOMMENDED_INSULIN_AMOUNT,
			:ACTUAL_INSULIN_TAKEN
		)
	`

	id, err := db.NamedInsertGetLastRowIDTx(tx, query, event)

	return id, err
}

func (db *SqliteDatabase) LoadUserEventFoodLog(
	ctx context.Context,
	userID int,
	eventlogID int,
	eventWithFood *database.UserEventFoodLog,
) error {

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		var eventlog database.TblUserEventLog

		if err := db.LoadUserEventLogTx(tx, userID, eventlogID, &eventlog); err != nil {
			return err
		}

		var eventlogWithFood database.UserEventFoodLog

		if err := db.LoadUserFoodLogByEventLogTx(tx, userID, eventlogID, &eventlogWithFood.Foodlogs); err != nil {
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

func (db *SqliteDatabase) LoadUserEventFoodLogsN(
	ctx context.Context,
	userID int,
	n int,
	eventWithFood *[]database.UserEventFoodLog,
) error {

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		var eventlogs []database.TblUserEventLog

		if err := db.LoadUserEventLogsNTx(tx, userID, n, &eventlogs); err != nil {
			return err
		}

		eventlogsWithFood := make([]database.UserEventFoodLog, len(eventlogs))

		for i, eventlog := range eventlogs {

			ewfood := &eventlogsWithFood[i]

			if err := db.LoadUserFoodLogByEventLogTx(tx, userID, eventlog.ID, &ewfood.Foodlogs); err != nil {
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

func (db *SqliteDatabase) LoadUserEventFoodLogs(
	ctx context.Context,
	userID int,
	eventWithFood *[]database.UserEventFoodLog,
) error {

	return db.LoadUserEventFoodLogsN(ctx, userID, -1, eventWithFood)
}

func (db *SqliteDatabase) LoadUserEventLogs(ctx context.Context, userID int, out *[]database.TblUserEventLog) error {

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {
		return db.LoadUserEventLogsTx(tx, userID, out)
	})
}

func (db *SqliteDatabase) LoadUserEventLogsNTx(tx *sqlx.Tx, userID int, n int, out *[]database.TblUserEventLog) error {

	query := `
		SELECT * FROM PON_USER_EVENTLOG el
		WHERE el.USER_ID = $1
		ORDER BY el.USER_TIME DESC
		LIMIT $2
	`

	return tx.Select(out, query, userID, n)
}

func (db *SqliteDatabase) LoadUserEventLogsTx(tx *sqlx.Tx, userID int, out *[]database.TblUserEventLog) error {

	query := `
		SELECT * FROM PON_USER_EVENTLOG el
		WHERE el.USER_ID = $1
		ORDER BY el.USER_TIME DESC
	`

	return tx.Select(out, query, userID)
}

func (db *SqliteDatabase) LoadUserEventLogTx(
	tx *sqlx.Tx,
	userID int,
	eventlogID int,
	out *database.TblUserEventLog,
) error {

	query := `
		SELECT * FROM PON_USER_EVENTLOG el
		WHERE el.USER_ID = $1 AND el.ID = $2
	`

	return tx.Get(out, query, userID, eventlogID)
}

func (db *SqliteDatabase) UpdateUserEventFoodLog(ctx context.Context, eventlog *database.UpdateUserEventLog) error {

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		var err error

		_, err = tx.Exec(
			`DELETE FROM PON_USER_FOODLOG WHERE USER_ID = $1 AND EVENTLOG_ID = $2`,
			eventlog.Eventlog.UserID,
			eventlog.Eventlog.ID,
		)

		if err != nil {
			return err
		}

		if eventlog.Eventlog.UserTime.Time().IsZero() {
			eventlog.Eventlog.UserTime = database.TimeMillis(time.Now().UTC())
		}

		{ // if the user changed the name of the event
			var event database.TblUserEvent

			if err = db.LoadAndOrCreateUserEventByNameTx(
				tx,
				eventlog.Eventlog.UserID,
				eventlog.Eventlog.Event,
				&event,
			); err != nil {
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

		query := `UPDATE PON_USER_EVENTLOG SET ` +
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

func (db *SqliteDatabase) DeleteUserEventLog(
	ctx context.Context,
	userID int,
	eventlogID int,
	deleteFoodLogs bool,
) error {

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		var err error

		if deleteFoodLogs {

			_, err = tx.Exec(`DELETE FROM PON_USER_FOODLOG WHERE USER_ID = $1 AND EVENTLOG_ID = $2`, userID, eventlogID)

			if err != nil {
				return err
			}
		} else {

			_, err = tx.Exec(
				`UPDATE PON_USER_FOODLOG SET EVENTLOG_ID = null WHERE USER_ID = $1 AND EVENTLOG_ID = $2`,
				userID,
				eventlogID,
			)

			if err != nil {
				return err
			}
		}

		_, err = tx.Exec(`DELETE FROM PON_USER_EVENTLOG WHERE USER_ID = $1 AND ID = $2`, userID, eventlogID)

		return err
	})
}

func (db *SqliteDatabase) ExportUserEventLogsCSV(ctx context.Context, w io.Writer) error {

	query := `SELECT * FROM PON_USER_EVENTLOG`

	return db.ExportQueryRowsAsCsv(ctx, query, w)
}
