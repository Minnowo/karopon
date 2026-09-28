package postgres

import (
	"context"
	"karopon/src/database"

	"github.com/vinovest/sqlx"
)

func (db *PGDatabase) AddUserTag(ctx context.Context, tag *database.TblUserTag) (int, error) {

	query := `
		INSERT INTO PON.USER_TAG (
			user_id, namespace, name
		) VALUES (
			:user_id, :namespace, :name
		) RETURNING id
	`

	return db.NamedInsertReturningID(ctx, query, tag)
}

func (db *PGDatabase) GetOrCreateUserTag(ctx context.Context, userID int, namespace, name string) (int, error) {

	query := `
		WITH ins AS (
			INSERT INTO PON.USER_TAG (user_id, namespace, name)
			VALUES ($1, $2, $3)
			ON CONFLICT (user_id, namespace, name) DO NOTHING
			RETURNING id
		)
		SELECT id FROM ins
			UNION ALL
		SELECT id FROM PON.USER_TAG WHERE user_id = $1 AND namespace = $2 AND name = $3
		LIMIT 1
	`

	var id int

	err := db.GetContext(ctx, &id, query, userID, namespace, name)

	return id, err
}

func (db *PGDatabase) DeleteUserTag(ctx context.Context, userID int, namespace, name string) error {

	query := `DELETE FROM PON.USER_TAG WHERE USER_ID = $1 AND NAMESPACE = $2 AND NAME = $3`
	_, err := db.ExecContext(ctx, query, userID, namespace, name)

	return err
}

func (db *PGDatabase) UpdateUserTag(
	ctx context.Context,
	userID int,
	namespace, name, newNamespace, newName string,
	merge bool,
) error {

	if namespace == newNamespace && name == newName {
		return nil
	}

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		// which = 1 identifies the row (if any) for the tag being renamed,
		// which = 2 identifies the row (if any) for a tag already at the new name.
		var rows []struct {
			Which int `db:"which"`
			ID    int `db:"id"`
		}

		query := `
			SELECT 1 AS which, ID AS id FROM PON.USER_TAG WHERE USER_ID = $1 AND NAMESPACE = $2 AND NAME = $3
			UNION ALL
			SELECT 2 AS which, ID AS id FROM PON.USER_TAG WHERE USER_ID = $1 AND NAMESPACE = $4 AND NAME = $5
		`
		if err := tx.Select(&rows, query, userID, namespace, name, newNamespace, newName); err != nil {
			return err
		}

		var oldTagID, existingTagID int
		var oldExists, newExists bool
		for _, r := range rows {
			switch r.Which {
			case 1:
				oldTagID, oldExists = r.ID, true
			case 2:
				existingTagID, newExists = r.ID, true
			}
		}

		if !oldExists {
			return nil
		}

		if !newExists {

			query := `UPDATE PON.USER_TAG SET NAMESPACE = $1, NAME = $2 WHERE ID = $3`
			_, err := tx.Exec(query, newNamespace, newName, oldTagID)

			return err
		}

		if !merge {
			return database.ErrTagAlreadyExists
		}

		// Remove the old tag from timespans that also have the new tag to handle duplicates
		query = `
			DELETE FROM PON.USER_TIMESPAN_TAG t1
			USING PON.USER_TIMESPAN_TAG t2
			WHERE t1.TIMESPAN_ID = t2.TIMESPAN_ID
			  AND t1.TAG_ID = $1
			  AND t2.TAG_ID = $2;
		`

		if _, err := tx.Exec(query, oldTagID, existingTagID); err != nil {
			return err
		}

		query = `UPDATE PON.USER_TIMESPAN_TAG SET TAG_ID = $1 WHERE TAG_ID = $2`

		if _, err := tx.Exec(query, existingTagID, oldTagID); err != nil {
			return err
		}

		// Same for exercises and workouts.
		for _, link := range []struct{ table, ownerCol string }{
			{"PON.USER_EXERCISE_TAG", "EXERCISE_ID"},
			{"PON.USER_WORKOUT_TAG", "WORKOUT_ID"},
		} {
			query = `
				DELETE FROM ` + link.table + ` t1
				USING ` + link.table + ` t2
				WHERE t1.` + link.ownerCol + ` = t2.` + link.ownerCol + `
				  AND t1.TAG_ID = $1
				  AND t2.TAG_ID = $2;
			`

			if _, err := tx.Exec(query, oldTagID, existingTagID); err != nil {
				return err
			}

			query = `UPDATE ` + link.table + ` SET TAG_ID = $1 WHERE TAG_ID = $2`

			if _, err := tx.Exec(query, existingTagID, oldTagID); err != nil {
				return err
			}
		}

		query = `DELETE FROM PON.USER_TAG WHERE ID = $1`
		_, err := tx.Exec(query, oldTagID)

		return err
	})
}

func (db *PGDatabase) LoadUserTags(ctx context.Context, userID int, out *[]database.TblUserTag) error {

	query := `
		SELECT * FROM PON.USER_TAG
		WHERE USER_ID = $1
		ORDER BY NAMESPACE, NAME ASC
	`

	return db.SelectContext(ctx, out, query, userID)
}

func (db *PGDatabase) LoadUserTagNamespaces(ctx context.Context, userID int, out *[]string) error {

	query := `
		SELECT DISTINCT NAMESPACE FROM PON.USER_TAG
		WHERE USER_ID = $1
		ORDER BY NAMESPACE ASC
	`

	return db.SelectContext(ctx, out, query, userID)
}

func (db *PGDatabase) LoadUserNamespaceTags(
	ctx context.Context,
	userID int,
	namespace string,
	out *[]database.TblUserTag,
) error {

	query := `
		SELECT * FROM PON.USER_TAG
		WHERE USER_ID = $1 AND NAMESPACE = $2
		ORDER BY NAMESPACE, NAME ASC
	`

	return db.SelectContext(ctx, out, query, userID, namespace)
}

func (db *PGDatabase) LoadUserNamespaceTagsLikeN(
	ctx context.Context,
	userID int,
	namespace, tagNameLike string,
	n int,
	out *[]database.TblUserTag,
) error {

	query := `
		SELECT * FROM PON.USER_TAG
		WHERE USER_ID = $1 AND NAMESPACE = $2 AND NAME ILIKE $3 ESCAPE '\'
		ORDER BY NAMESPACE, NAME ASC
		LIMIT $4
	`

	search := db.BackslashEscapePattern(tagNameLike) + "%"

	return db.SelectContext(ctx, out, query, userID, namespace, search, n)
}
