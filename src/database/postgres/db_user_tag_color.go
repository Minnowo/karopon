package postgres

import (
	"context"
	"karopon/src/database"

	"github.com/vinovest/sqlx"
)

func (db *PGDatabase) LoadUserTagColors(ctx context.Context, userID int, out *[]database.TblUserTagColor) error {

	query := `SELECT user_id, namespace, color FROM PON.USER_TAG_COLOR WHERE user_id = $1 ORDER BY namespace ASC`

	return db.SelectContext(ctx, out, query, userID)
}

func (db *PGDatabase) SetUserTagColors(ctx context.Context, colors []database.TblUserTagColor) error {

	query := `
		INSERT INTO PON.USER_TAG_COLOR (user_id, namespace, color)
		VALUES (:user_id, :namespace, :color)
		ON CONFLICT (user_id, namespace) DO UPDATE SET color = EXCLUDED.color
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

func (db *PGDatabase) DeleteUserTagColors(ctx context.Context, userID int, namespace []string) error {

	if len(namespace) == 0 {
		return nil
	}

	query, args, err := sqlx.In(`DELETE FROM PON.USER_TAG_COLOR WHERE USER_ID = ? AND NAMESPACE IN (?)`,
		userID, namespace)

	if err != nil {
		return err
	}

	query = db.Rebind(query)

	_, err = db.Exec(query, args...)

	return err
}
