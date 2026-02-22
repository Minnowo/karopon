package sqlite

import (
	"context"
	"io"
	"karopon/src/database"
)

func (db *SqliteDatabase) LoadUserBodyLogs(ctx context.Context, userID int, out *[]database.TblUserBodyLog) error {

	query := `
		SELECT * FROM PON_USER_BODYLOG f
		WHERE f.USER_ID = $1
		ORDER BY f.USER_TIME DESC
	`

	return db.SelectContext(ctx, out, query, userID)
}

func (db *SqliteDatabase) AddUserBodyLogs(ctx context.Context, log *database.TblUserBodyLog) (int, error) {

	query := `
		INSERT INTO PON_USER_BODYLOG(
			USER_ID, USER_TIME, 
			WEIGHT_KG, HEIGHT_CM, 
			BODY_FAT_PERCENT, BMI, 
			BP_SYSTOLIC, BP_DIASTOLIC, 
			HEART_RATE_BPM, STEPS_COUNT
		) VALUES (
			:USER_ID, :USER_TIME, 
			:WEIGHT_KG, :HEIGHT_CM, 
			:BODY_FAT_PERCENT, :BMI, 
			:BP_SYSTOLIC, :BP_DIASTOLIC, 
			:HEART_RATE_BPM, :STEPS_COUNT
		)
	`

	return db.NamedInsertGetLastRowID(ctx, query, log)
}

func (db *SqliteDatabase) DeleteUserBodyLog(ctx context.Context, userID int, bodyLogID int) error {

	query := `DELETE FROM PON_USER_BODYLOG WHERE USER_ID = $1 AND ID = $2`

	_, err := db.ExecContext(ctx, query, userID, bodyLogID)

	return err
}

func (db *SqliteDatabase) ExportBodyLogCSV(ctx context.Context, w io.Writer) error {

	query := `SELECT * FROM PON_USER_BODYLOG`

	return db.ExportQueryRowsAsCsv(ctx, query, w)
}
