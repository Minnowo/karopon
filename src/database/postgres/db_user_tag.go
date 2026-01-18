package postgres

import (
	"context"
	"karopon/src/database"
)

func (db *PGDatabase) AddUserTag(ctx context.Context, tag *database.TblUserTag) (int, error) {
	query := `
		INSERT INTO PON.USER_TAG (
			user_id, namespace, name
		) VALUES (
			:user_id, :namespace, :name
		) RETURNING id
	`

	return db.InsertOneNamedGetID(ctx, query, tag)
}

func (db *PGDatabase) LoadUserTags(ctx context.Context, userId int, out *[]database.TblUserTag) error {

	query := `
		SELECT * FROM PON.USER_TAG
		WHERE USER_ID = $1
		ORDER BY NAMESPACE, NAME ASC
	`

	return db.SelectContext(ctx, out, query, userId)
}

func (db *PGDatabase) LoadUserNamespaceTags(ctx context.Context, userId int, namespace string, out *[]database.TblUserTag) error {

	query := `
		SELECT * FROM PON.USER_TAG
		WHERE USER_ID = $1 AND NAMESPACE = $2
		ORDER BY NAMESPACE, NAME ASC
	`

	return db.SelectContext(ctx, out, query, userId, namespace)
}
