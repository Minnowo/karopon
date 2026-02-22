package sqlite

import (
	"context"
	"karopon/src/database"
	"strings"
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
		WHERE USER_ID = $1 AND NAMESPACE = $2 AND LOWER(NAME) LIKE $3
		ORDER BY NAMESPACE, NAME ASC
		LIMIT $4
	`

	search := db.BackslashEscapePattern(strings.ToLower(tagNameLike)) + "%"

	return db.SelectContext(ctx, out, query, userID, namespace, search, n)
}
