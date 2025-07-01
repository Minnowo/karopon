package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"karopon/src/database"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/rs/zerolog/log"
)

func (db *PGDatabase) AddUserFoodLog(ctx context.Context, food *database.TblUserFoodLog) (int, error) {

	var finalID struct {
		id int
	}

	err := db.WithTx(ctx, func(tx *sqlx.Tx) error {

		var query string

		{ // USER_FOOD table stuff
			query = `
			SELECT ID FROM PON.USER_FOOD f
			WHERE f.USER_ID = $1 AND f.NAME = $2 AND f.UNIT = $3
			LIMIT 1
			`

			if err := tx.QueryRow(query, food.UserID, food.Name, food.Unit).Scan(&food.FoodID); err == sql.ErrNoRows {

				log.Debug().Msg("got error no rows")

				query = `
				INSERT INTO PON.USER_FOOD (USER_ID, NAME, UNIT, PORTION, PROTEIN, CARB, FIBRE, FAT)
				VALUES (:user_id, :name, :unit, :portion, :protein, :carb, :fibre, :fat)
				RETURNING ID;
				`

				if food.Portion == 0 {
					return fmt.Errorf("portion cannot be 0")
				}

				newFood := database.TblUserFood{
					UserID:  food.UserID,
					Name:    food.Name,
					Unit:    food.Unit,
					Portion: food.Portion,
					Protein: food.Protein,
					Carb:    food.Carb,
					Fibre:   food.Fibre,
					Fat:     food.Fat,
				}
				newFood.Scale()

				if id, err := db.InsertOneNamedGetIDTx(tx, query, newFood); err != nil {
					return err
				} else {
					food.FoodID = id
					log.Debug().Int("id", food.FoodID).Msg("created new food")
				}

			} else if err != nil {
				return err
			} else {
				log.Debug().Int("id", food.FoodID).Msg("found existing food")
			}
		}

		if food.Event != "" { // USER_EVENT table stuff

			query = `
			SELECT ID FROM PON.USER_EVENT e
			WHERE e.USER_ID = $1 AND e.NAME = $2
			LIMIT 1
			`

			if err := tx.QueryRow(query, food.UserID, food.Event).Scan(&food.EventID); err == sql.ErrNoRows {

				log.Debug().Msg("got error no rows")

				query = `
				INSERT INTO PON.USER_EVENT (USER_ID, NAME)
				VALUES (:user_id, :name)
				RETURNING ID;
				`

				event := database.TblUserEvent{
					UserID: food.UserID,
					Name:   food.Event,
				}

				if id, err := db.InsertOneNamedGetIDTx(tx, query, event); err != nil {
					return err
				} else {
					food.EventID = &id
					log.Debug().Int("id", *food.EventID).Msg("created new event")
				}

			} else if err != nil {
				return err
			} else {
				log.Debug().Int("id", *food.EventID).Msg("found existing event")
			}
		}

		query = `
			INSERT INTO PON.USER_FOODLOG (USER_ID, FOOD_ID, USER_TIME, NAME, EVENT, UNIT, PORTION, PROTEIN, CARB, FIBRE, FAT, EVENT_ID, EVENTLOG_ID)
			VALUES (:user_id, :food_id, :user_time, :name, :event, :unit, :portion, :protein, :carb, :fibre, :fat, :event_id, :eventlog_id)
			RETURNING ID;
		`

		food.UserTime = database.UnixMillis(time.Now().UTC())

		id, err := db.InsertOneNamedGetIDTx(tx, query, food)

		if err != nil {
			return err
		}

		finalID.id = id

		return nil
	})

	return finalID.id, err
}

func (db *PGDatabase) LoadUserEventsWithFood(ctx context.Context, userId int, out *[]database.UserEventWithFoods) error {

	var groupedEvents []database.UserEventWithFoods
	var events []database.TblUserEvent

	if err := db.LoadUserEvents(ctx, userId, &events); err != nil {
		return err
	}

	for _, event := range events {

		geven := database.UserEventWithFoods{Event: event}

		if err := db.LoadUserFoodLogByEvent(ctx, userId, event.ID, &geven.Foods); err != nil {
			return err
		}
		groupedEvents = append(groupedEvents, geven)
	}

	*out = groupedEvents

	return nil
}

func (db *PGDatabase) LoadUserFoodLogs(ctx context.Context, userId int, out *[]database.TblUserFoodLog) error {
	query := `
		SELECT * FROM PON.USER_FOODLOG fl
		WHERE fl.USER_ID = $1
		ORDER BY fl.USER_TIME DESC
	`

	return db.SelectContext(ctx, out, query, userId)
}

func (db *PGDatabase) LoadUserFoodLogByEvent(ctx context.Context, userId int, eventId int, out *[]database.TblUserFoodLog) error {
	query := `
		SELECT * FROM PON.USER_FOODLOG fl
		WHERE fl.USER_ID = $1 AND fl.EVENT_ID = $2
		ORDER BY fl.USER_TIME DESC
	`

	return db.SelectContext(ctx, out, query, userId, eventId)
}
