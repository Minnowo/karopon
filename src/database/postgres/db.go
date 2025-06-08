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

type PGDatabase struct {
	database.SQLxDB
	version database.Version
}

func (db *PGDatabase) DBx() *sqlx.DB {
	return db.DB
}

func (db *PGDatabase) GetVersion(ctx context.Context) (database.Version, error) {
	var config database.TblConfig
	query := `SELECT version FROM PON.CONFIG LIMIT 1`
	err := db.GetContext(ctx, &config, query)
	if err != nil {
		return database.VERSION_NONE, err
	}
	if !config.Version.Valid() {
		return database.VERSION_NONE, database.ErrInvalidDatabaseVersion
	}
	return config.Version, nil
}

func (db *PGDatabase) SetVersionTx(tx *sqlx.Tx, version database.Version) error {

	_, err := tx.Exec("UPDATE PON.CONFIG SET version = $1", int(version))

	if err != nil {
		return fmt.Errorf("could not update database version: %s", err)
	}

	return nil
}

func (db *PGDatabase) SetVersion(ctx context.Context, version database.Version) error {

	_, err := db.ExecContext(ctx, "UPDATE PON.CONFIG SET version = $1", int(version))

	if err != nil {
		return fmt.Errorf("could not update database version: %s", err)
	}

	return nil
}

func (db *PGDatabase) AddFood(ctx context.Context, food *database.TblUserFood) (int, error) {

	query := `
        INSERT INTO PON.USER_FOOD (USER_ID, NAME, UNIT, PORTION, PROTEIN, CARB, FIBRE, FAT)
		VALUES (:user_id, :name, :unit, :portion, :protein, :carb, :fibre, :fat)
        RETURNING ID;
    `

	id, err := db.InsertOneNamedGetID(ctx, query, food)

	return id, err
}

func (db *PGDatabase) AddFoods(ctx context.Context, foods []*database.TblUserFood) error {

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		query := `
			INSERT INTO PON.USER_FOOD (USER_ID, NAME, UNIT, PORTION, PROTEIN, CARB, FIBRE, FAT)
			VALUES (:user_id, :name, :unit, :portion, :protein, :carb, :fibre, :fat)
    	`
		for _, food := range foods {

			_, err := tx.NamedExec(query, food)

			if err != nil {
				return err
			}
		}

		return nil
	})
}

func (db *PGDatabase) LoadFoods(ctx context.Context, userId int, out *[]database.TblUserFood) error {
	query := `
		SELECT * FROM PON.USER_FOOD f
		WHERE f.USER_ID = $1
	`

	return db.SelectContext(ctx, out, query, userId)
}

func (db *PGDatabase) CreateUser(ctx context.Context, user *database.TblUser) (int, error) {

	query := `
        INSERT INTO PON.USER (NAME, PASSWORD)
        VALUES (:name, :password)
        RETURNING ID;
    `

	id, err := db.InsertOneNamedGetID(ctx, query, user)

	return id, err
}

func (db *PGDatabase) GetUser(ctx context.Context, username string) (*database.TblUser, error) {

	var user database.TblUser

	query := `SELECT ID, NAME, PASSWORD, CREATED FROM PON.USER WHERE NAME = $1 LIMIT 1`

	err := db.GetContext(ctx, &user, query, username)

	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (db *PGDatabase) LoadUsers(ctx context.Context, users *[]database.TblUser) error {
	query := `
	SELECT * FROM PON.USER fl
	`

	return db.SelectContext(ctx, users, query)
}

func (db *PGDatabase) LogUserFood(ctx context.Context, food *database.TblUserFoodLog) (int, error) {

	var finalID struct {
		id int
	}

	err := db.WithTx(ctx, func(tx *sqlx.Tx) error {

		var query string

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

			scaledFood := database.TblUserFood{
				UserID:  food.UserID,
				Name:    food.Name,
				Unit:    food.Unit,
				Portion: 1,
				Protein: food.Protein / float32(food.Portion),
				Carb:    food.Carb / float32(food.Portion),
				Fibre:   food.Fibre / float32(food.Portion),
				Fat:     food.Fat / float32(food.Portion),
			}

			if id, err := db.InsertOneNamedGetIDTx(tx, query, scaledFood); err != nil {
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

		query = `
			INSERT INTO PON.USER_FOODLOG (USER_ID, FOOD_ID, USER_TIME, NAME, EVENT, UNIT, PORTION, PROTEIN, CARB, FIBRE, FAT)
			VALUES (:user_id, :food_id, :user_time, :name, :event, :unit, :portion, :protein, :carb, :fibre, :fat)
			RETURNING ID;
		`

		food.UserTime = time.Now().UTC()

		id, err := db.InsertOneNamedGetIDTx(tx, query, food)

		if err != nil {
			return err
		}

		finalID.id = id

		return nil
	})

	return finalID.id, err
}

func (db *PGDatabase) LogUserFoodEvent(ctx context.Context, userId int, food *database.TblUserFood, event *database.TblUserEvent) (int, error) {

	query := `
        INSERT INTO PON.USER_FOODLOG (USER_ID, FOOD_ID, USER_TIME, NAME, EVENT, UNIT, PORTION, PROTEIN, CARB, FIBRE, FAT, EVENT_ID)
		VALUES (:user_id, :food_id, :user_time, :name, :event, :unit, :portion, :protein, :carb, :fibre, :fat, :event_id)
        RETURNING ID;
    `

	id, err := db.InsertOneNamedGetID(ctx, query, &database.TblUserFoodLog{
		UserID:   userId,
		FoodID:   food.ID,
		UserTime: time.Now(),
		Name:     food.Name,
		Event:    event.Event,
		EventID:  sql.NullInt64{Int64: int64(event.ID), Valid: true},
		Unit:     food.Unit,
		Portion:  food.Portion,
		Protein:  food.Protein,
		Carb:     food.Carb,
		Fibre:    food.Fibre,
		Fat:      food.Fat,
	})

	return id, err
}

func (db *PGDatabase) CreateEvent(ctx context.Context, event *database.TblEvent) (int, error) {
	query := `
		INSERT INTO PON.EVENT (NAME)
		VALUES (:name)
		RETURNING ID;
	`

	id, err := db.InsertOneNamedGetID(ctx, query, event)

	return id, err
}
func (db *PGDatabase) CreateUserEvent(ctx context.Context, event *database.TblUserEvent) (int, error) {

	query := `
		INSERT INTO PON.USER_EVENT 
		(USER_ID, EVENT_ID, CREATED, USER_TIME, EVENT, NET_CARBS, BLOOD_GLUCOSE, BLOOD_GLUCOSE_TARGET, INSULIN_SENSITIVITY_FACTOR, INSULIN_TO_CARB_RATIO, RECOMMENDED_INSULIN_AMOUNT, ACTUAL_INSULIN_TAKEN)
		VALUES 
		(:user_id, :event_id, :created, :user_time, :event, :net_carbs, :blood_glucose, :blood_glucose_target, :insulin_sensitivity_factor, :insulin_to_carb_ratio, :recommended_insulin_amount, :actual_insulin_taken)
		RETURNING ID;
	`

	id, err := db.InsertOneNamedGetID(ctx, query, event)

	return id, err
}

func (db *PGDatabase) LoadUserEvent(ctx context.Context, eventId int, out *database.TblUserEvent) error {
	query := `
		SELECT * FROM PON.USER_EVENT u
		WHERE u.ID = $1
		LIMIT 1
	`

	return db.SelectContext(ctx, out, query, eventId)
}

func (db *PGDatabase) LoadUserEvents(ctx context.Context, userId int, out *[]database.TblUserEvent) error {
	query := `
		SELECT * FROM PON.USER_EVENT u
		WHERE u.USER_ID = $1
		ORDER BY u.USER_TIME DESC
	`

	return db.SelectContext(ctx, out, query, userId)
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

func (db *PGDatabase) LoadUserFoodLog(ctx context.Context, userId int, out *[]database.TblUserFoodLog) error {
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
