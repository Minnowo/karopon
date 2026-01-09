package postgres

import (
	"context"
	"io"
	"karopon/src/database"

	"github.com/jmoiron/sqlx"
)

func (db *PGDatabase) LoadUserBodyLogs(ctx context.Context, userId int, out *[]database.TblUserBodyLog) error {

	query := `
		SELECT * FROM PON.USER_BODYLOG f
		WHERE f.USER_ID = $1
		ORDER BY f.USER_TIME DESC
	`

	return db.SelectContext(ctx, out, query, userId)
}

func (db *PGDatabase) AddUserBodyLogs(ctx context.Context, log *database.TblUserBodyLog) (int, error) {

	var retUserId int = -1

	err := db.WithTx(ctx, func(tx *sqlx.Tx) error {
		query := `
			INSERT INTO PON.USER_BODYLOG(
				USER_ID, USER_TIME, 
				WEIGHT_KG, HEIGHT_CM, 
				BODY_FAT_PERCENT, BMI, 
				BP_SYSTOLIC, BP_DIASTOLIC, 
				HEART_RATE_BPM, STEPS_COUNT
			) VALUES (
				:user_id, :user_time, 
				:weight_kg, :height_cm, 
				:body_fat_percent, :bmi, 
				:bp_systolic, :bp_diastolic, 
				:heart_rate_bpm, :steps_count
			)
    	    RETURNING ID;
    	`

		id, err := db.InsertOneNamedGetIDTx(tx, query, log)

		if err != nil {
			return err
		}

		retUserId = id

		return nil
	})

	return retUserId, err
}

func (db *PGDatabase) DeleteUserBodyLog(ctx context.Context, userId int, bodyLogId int) error {

	query := `DELETE FROM PON.USER_BODYLOG WHERE USER_ID = $1 AND ID = $2`

	_, err := db.ExecContext(ctx, query, userId, bodyLogId)

	return err
}

func (db *PGDatabase) ExportBodyLogCSV(ctx context.Context, w io.Writer) error {

	query := `SELECT * FROM PON.USER_BODYLOG`

	return db.ExportQueryRowsAsCsv(ctx, query, w)
}
