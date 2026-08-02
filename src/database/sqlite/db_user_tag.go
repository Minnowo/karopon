package sqlite

import (
	"context"
	"karopon/src/database"
	"strings"

	"github.com/vinovest/sqlx"
)

func (db *SqliteDatabase) AddUserTag(ctx context.Context, tag *database.TblUserTag) (int, error) {
	query := `
		INSERT INTO PON_USER_TAG (
			USER_ID, NAMESPACE, NAME
		) VALUES (
			:USER_ID, :NAMESPACE, :NAME
		)
	`

	return db.NamedInsertGetLastRowID(ctx, query, tag)
}

func (db *SqliteDatabase) DeleteUserTag(ctx context.Context, userID int, namespace, name string) error {
	query := `DELETE FROM PON_USER_TAG WHERE USER_ID = $1 AND NAMESPACE = $2 AND NAME = $3`
	_, err := db.ExecContext(ctx, query, userID, namespace, name)
	return err
}

func (db *SqliteDatabase) UpdateUserTag(
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
			SELECT 1 AS which, ID AS id FROM PON_USER_TAG WHERE USER_ID = $1 AND NAMESPACE = $2 AND NAME = $3
			UNION ALL
			SELECT 2 AS which, ID AS id FROM PON_USER_TAG WHERE USER_ID = $1 AND NAMESPACE = $4 AND NAME = $5
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

			query := `UPDATE PON_USER_TAG SET NAMESPACE = $1, NAME = $2 WHERE ID = $3`
			_, err := tx.Exec(query, newNamespace, newName, oldTagID)

			return err
		}

		if !merge {
			return database.ErrTagAlreadyExists
		}

		// Remove the old tag from timespans that also have the new tag to handle duplicates
		query = `
			DELETE FROM PON_USER_TIMESPAN_TAG AS t1
			WHERE t1.TAG_ID = $1
			  AND EXISTS (
				  SELECT 1
				  FROM PON_USER_TIMESPAN_TAG AS t2
				  WHERE t2.TIMESPAN_ID = t1.TIMESPAN_ID
					AND t2.TAG_ID = $2
				  LIMIT 1
			  );
		`

		if _, err := tx.Exec(query, oldTagID, existingTagID); err != nil {
			return err
		}

		query = `UPDATE PON_USER_TIMESPAN_TAG SET TAG_ID = $1 WHERE TAG_ID = $2`

		if _, err := tx.Exec(query, existingTagID, oldTagID); err != nil {
			return err
		}

		query = `DELETE FROM PON_USER_TAG WHERE ID = $1`
		_, err := tx.Exec(query, oldTagID)

		return err
	})
}

func (db *SqliteDatabase) LoadUserTags(ctx context.Context, userID int, out *[]database.TblUserTag) error {

	query := `
		SELECT * FROM PON_USER_TAG
		WHERE USER_ID = $1
		ORDER BY NAMESPACE, NAME ASC
	`

	return db.SelectContext(ctx, out, query, userID)
}

func (db *SqliteDatabase) LoadUserTagNamespaces(ctx context.Context, userID int, out *[]string) error {

	query := `
		SELECT DISTINCT NAMESPACE FROM PON_USER_TAG
		WHERE USER_ID = $1
		ORDER BY NAMESPACE ASC
	`

	return db.SelectContext(ctx, out, query, userID)
}

func (db *SqliteDatabase) LoadUserNamespaceTags(
	ctx context.Context,
	userID int,
	namespace string,
	out *[]database.TblUserTag,
) error {

	query := `
		SELECT * FROM PON_USER_TAG
		WHERE USER_ID = $1 AND NAMESPACE = $2
		ORDER BY NAMESPACE, NAME ASC
	`

	return db.SelectContext(ctx, out, query, userID, namespace)
}

func (db *SqliteDatabase) LoadUserNamespaceTagsLikeN(
	ctx context.Context,
	userID int,
	namespace, tagNameLike string,
	n int,
	out *[]database.TblUserTag,
) error {

	query := `
		SELECT * FROM PON_USER_TAG
		WHERE USER_ID = $1 AND NAMESPACE = $2 AND LOWER(NAME) LIKE $3 ESCAPE '\'
		ORDER BY NAMESPACE, NAME ASC
		LIMIT $4
	`

	search := db.BackslashEscapePattern(strings.ToLower(tagNameLike)) + "%"

	return db.SelectContext(ctx, out, query, userID, namespace, search, n)
}
