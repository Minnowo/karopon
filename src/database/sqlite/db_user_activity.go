package sqlite

import (
	"context"
	"karopon/src/database"
)

func (db *SqliteDatabase) AddUserActivity(ctx context.Context, activity *database.TblUserActivity) (int, error) {

	query := `
        INSERT INTO PON_USER_ACTIVITY (USER_ID, NAME, TAG_ID, DURATION, NOTE)
			VALUES (:USER_ID, :NAME, :TAG_ID, :DURATION, :NOTE)
    `

	id, err := db.NamedInsertGetLastRowID(ctx, query, activity)

	return id, err
}

func (db *SqliteDatabase) UpdateUserActivity(ctx context.Context, activity *database.TblUserActivity) error {

	query := `
		UPDATE PON_USER_ACTIVITY
		SET
			NAME     = :NAME,
			TAG_ID   = :TAG_ID,
			DURATION = :DURATION,
			NOTE     = :NOTE
		WHERE USER_ID = :USER_ID AND ID = :ID
    `

	_, err := db.NamedExecContext(ctx, query, activity)

	return err
}

func (db *SqliteDatabase) DeleteUserActivity(ctx context.Context, userID int, activityID int) error {

	query := `
	DELETE FROM PON_USER_ACTIVITY
	WHERE USER_ID = $1 AND ID = $2
	`

	_, err := db.ExecContext(ctx, query, userID, activityID)

	return err
}

func (db *SqliteDatabase) LoadUserActivities(ctx context.Context, userID int, out *[]database.ActivityWithTag) error {

	var results []struct {
		database.TblUserActivity
		TagNamespace string `db:"tag_namespace"`
		TagName      string `db:"tag_name"`
	}

	query := `
		SELECT
			a.ID, a.USER_ID, a.NAME, a.TAG_ID, a.DURATION, a.NOTE,
			t.NAMESPACE AS TAG_NAMESPACE, t.NAME AS TAG_NAME
		FROM PON_USER_ACTIVITY a
		JOIN PON_USER_TAG t ON t.ID = a.TAG_ID
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
