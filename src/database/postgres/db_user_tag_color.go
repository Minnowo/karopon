package postgres

import (
	"context"
	"karopon/src/database"
)

func (db *PGDatabase) LoadUserTagColors(ctx context.Context, userID int, out *[]database.TblUserTagColor) error {

	query := `SELECT user_id, namespace, color FROM PON.USER_TAG_COLOR WHERE user_id = $1 ORDER BY namespace ASC`

	return db.SelectContext(ctx, out, query, userID)
}

func (db *PGDatabase) SetUserTagColor(ctx context.Context, color *database.TblUserTagColor) error {

	query := `
		INSERT INTO PON.USER_TAG_COLOR (user_id, namespace, color)
		VALUES (:user_id, :namespace, :color)
		ON CONFLICT (user_id, namespace) DO UPDATE SET color = EXCLUDED.color
	`

	_, err := db.NamedExecContext(ctx, query, color)

	return err
}

func (db *PGDatabase) DeleteUserTagColor(ctx context.Context, userID int, namespace string) error {

	query := `DELETE FROM PON.USER_TAG_COLOR WHERE user_id = $1 AND namespace = $2`

	_, err := db.ExecContext(ctx, query, userID, namespace)

	return err
}
