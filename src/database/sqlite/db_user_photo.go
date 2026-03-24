package sqlite

import (
	"context"
	"karopon/src/database"

	"github.com/vinovest/sqlx"
)

func (db *SqliteDatabase) AddUserPhoto(ctx context.Context, photo *database.TblUserPhoto) (int, error) {

	query := `INSERT INTO PON_USER_PHOTO (USER_ID, DATA) VALUES (:USER_ID, :DATA)`

	return db.NamedInsertGetLastRowID(ctx, query, photo)
}

func (db *SqliteDatabase) AddUserEventLogPhotos(ctx context.Context, eventlogID int, photoIDs []int) error {

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		for _, photoID := range photoIDs {

			_, err := tx.Exec(
				`INSERT INTO PON_USER_EVENTLOG_PHOTO (EVENTLOG_ID, PHOTO_ID) VALUES ($1, $2)`,
				eventlogID,
				photoID,
			)

			if err != nil {
				return err
			}
		}

		return nil
	})
}
