package postgres

import (
	"context"
	"karopon/src/database"

	"github.com/vinovest/sqlx"
)

func (db *PGDatabase) AddUserPhoto(ctx context.Context, photo *database.TblUserPhoto) (int, error) {

	query := `INSERT INTO PON.USER_PHOTO (user_id, data) VALUES (:user_id, :data) RETURNING id`

	return db.NamedInsertReturningID(ctx, query, photo)
}

func (db *PGDatabase) AddUserEventLogPhotos(ctx context.Context, eventlogID int, photoIDs []int) error {

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		for _, photoID := range photoIDs {

			_, err := tx.Exec(
				`INSERT INTO PON.USER_EVENTLOG_PHOTO (eventlog_id, photo_id) VALUES ($1, $2)`,
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
