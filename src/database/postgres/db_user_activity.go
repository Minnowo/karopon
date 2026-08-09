package postgres

import (
	"context"
	"karopon/src/database"
)

func (db *PGDatabase) AddUserActivity(ctx context.Context, activity *database.TblUserActivity) (int, error) {

	query := `
        INSERT INTO PON.USER_ACTIVITY (USER_ID, NAME, TAG_ID, DURATION, NOTE)
			VALUES (:user_id, :name, :tag_id, :duration, :note)
        RETURNING ID;
    `

	id, err := db.NamedInsertReturningID(ctx, query, activity)

	return id, err
}

func (db *PGDatabase) UpdateUserActivity(ctx context.Context, activity *database.TblUserActivity) error {

	query := `
		UPDATE PON.USER_ACTIVITY
		SET
			NAME     = :name,
			TAG_ID   = :tag_id,
			DURATION = :duration,
			NOTE     = :note
		WHERE USER_ID = :user_id AND ID = :id
    `

	_, err := db.NamedExecContext(ctx, query, activity)

	return err
}

func (db *PGDatabase) DeleteUserActivity(ctx context.Context, userID int, activityID int) error {

	query := `
	DELETE FROM PON.USER_ACTIVITY a
	WHERE a.USER_ID = $1 AND a.ID = $2
	`

	_, err := db.ExecContext(ctx, query, userID, activityID)

	return err
}

func (db *PGDatabase) LoadUserActivities(ctx context.Context, userID int, out *[]database.ActivityWithTag) error {

	var results []struct {
		database.TblUserActivity
		TagNamespace string `db:"tag_namespace"`
		TagName      string `db:"tag_name"`
	}

	query := `
		SELECT
			a.ID, a.USER_ID, a.NAME, a.TAG_ID, a.DURATION, a.NOTE,
			t.NAMESPACE AS TAG_NAMESPACE, t.NAME AS TAG_NAME
		FROM PON.USER_ACTIVITY a
		JOIN PON.USER_TAG t ON t.ID = a.TAG_ID
		WHERE a.USER_ID = $1
		ORDER BY a.NAME ASC
	`

	if err := db.SelectContext(ctx, &results, query, userID); err != nil {
		return err
	}

	data := make([]database.ActivityWithTag, len(results))

	for i, r := range results {
		data[i].Activity = r.TblUserActivity
		data[i].Tag = database.TblUserTag{
			ID:        r.TagID,
			UserID:    userID,
			Namespace: r.TagNamespace,
			Name:      r.TagName,
		}
	}

	*out = data

	return nil
}
