package sqlite

import (
	"context"
	"karopon/src/database"
)

func (db *SqliteDatabase) LoadUserTagColors(ctx context.Context, userID int, out *[]database.TblUserTagColor) error {

	query := `
		SELECT * FROM PON_USER_TAG_COLOR
		WHERE USER_ID = $1
		ORDER BY NAMESPACE ASC
	`

	return db.SelectContext(ctx, out, query, userID)
}

func (db *SqliteDatabase) SetUserTagColor(ctx context.Context, color *database.TblUserTagColor) error {

	query := `
		INSERT OR REPLACE INTO PON_USER_TAG_COLOR (USER_ID, NAMESPACE, COLOR)
		VALUES (:USER_ID, :NAMESPACE, :COLOR)
	`

	_, err := db.NamedExecContext(ctx, query, color)

	return err
}

func (db *SqliteDatabase) DeleteUserTagColor(ctx context.Context, userID int, namespace string) error {

	query := `DELETE FROM PON_USER_TAG_COLOR WHERE USER_ID = $1 AND NAMESPACE = $2`

	_, err := db.ExecContext(ctx, query, userID, namespace)

	return err
}
