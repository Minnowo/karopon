package sqlite

import (
	"context"
	"karopon/src/database"

	"github.com/vinovest/sqlx"
)

func (db *SqliteDatabase) LoadUserTagColors(ctx context.Context, userID int, out *[]database.TblUserTagColor) error {

	query := `
		SELECT * FROM PON_USER_TAG_COLOR
		WHERE USER_ID = $1
		ORDER BY NAMESPACE ASC
	`

	return db.SelectContext(ctx, out, query, userID)
}

func (db *SqliteDatabase) SetUserTagColors(ctx context.Context, colors []database.TblUserTagColor) error {

	query := `
		INSERT OR REPLACE INTO PON_USER_TAG_COLOR (USER_ID, NAMESPACE, COLOR)
		VALUES (:USER_ID, :NAMESPACE, :COLOR)
	`

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		stmt, err := tx.PrepareNamed(query)

		if err != nil {
			return err
		}

		for i := range len(colors) {

			_, err := stmt.Exec(colors[i])

			if err != nil {
				return err
			}
		}

		return nil
	})
}

func (db *SqliteDatabase) DeleteUserTagColors(ctx context.Context, userID int, namespace []string) error {

	if len(namespace) == 0 {
		return nil
	}

	query, args, err := sqlx.In(`DELETE FROM PON_USER_TAG_COLOR WHERE USER_ID = ? AND NAMESPACE IN (?)`,
		userID, namespace)

	if err != nil {
		return err
	}

	query = db.Rebind(query)

	_, err = db.Exec(query, args...)

	return err
}
