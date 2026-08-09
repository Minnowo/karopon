package postgres

import (
	"context"
	"encoding/json"
	"karopon/src/database"
	"sort"

	"github.com/vinovest/sqlx"
)

func (db *PGDatabase) AddUserReminder(
	ctx context.Context,
	r *database.TblUserReminder,
	activityIDs []int,
) (int, error) {

	var reminderID int

	err := db.WithTx(ctx, func(tx *sqlx.Tx) error {

		query := `
			INSERT INTO PON.USER_REMINDER (
				user_id, enabled, interval_minutes, last_activity_at, cron
			) VALUES (
				:user_id, :enabled, :interval_minutes, :last_activity_at, :cron
			) RETURNING id
		`

		id, err := db.NamedInsertReturningIDTx(tx, query, r)

		if err != nil {
			return err
		}

		if len(activityIDs) > 0 {

			if err := db.SetUserReminderActivitiesTx(tx, r.UserID, id, activityIDs); err != nil {
				return err
			}
		}

		reminderID = id

		return nil
	})

	return reminderID, err
}

func (db *PGDatabase) UpdateUserReminder(ctx context.Context, r *database.TblUserReminder) error {
	query := `
		UPDATE PON.USER_REMINDER
		SET
			ENABLED = :enabled,
			INTERVAL_MINUTES = :interval_minutes,
			LAST_ACTIVITY_AT = :last_activity_at,
			CRON = :cron
		WHERE ID = :id AND USER_ID = :user_id
	`

	_, err := db.NamedExecContext(ctx, query, r)

	return err
}

func (db *PGDatabase) DeleteUserReminder(ctx context.Context, userID int, reminderID int) error {

	query := `DELETE FROM PON.USER_REMINDER WHERE USER_ID = $1 AND ID = $2`

	_, err := db.ExecContext(ctx, query, userID, reminderID)

	return err
}

func (db *PGDatabase) LoadUserReminders(ctx context.Context, userID int, out *[]database.ReminderWithActivities) error {

	var results []struct {
		database.TblUserReminder
		Activities []byte `db:"activities"`
	}

	query := `
		SELECT
			r.ID, r.USER_ID, r.ENABLED, r.INTERVAL_MINUTES, r.LAST_ACTIVITY_AT, r.CRON,
			CASE
				WHEN COUNT(a.ID) = 0 THEN NULL
				ELSE jsonb_agg(jsonb_build_array(a.ID, a.NAME, a.TAG_ID, a.DURATION, a.NOTE, t.NAMESPACE, t.NAME))
			END AS activities
		FROM PON.USER_REMINDER r
		LEFT JOIN PON.USER_REMINDER_ACTIVITY ra ON (ra.REMINDER_ID = r.ID)
		LEFT JOIN PON.USER_ACTIVITY a ON (a.ID = ra.ACTIVITY_ID AND a.USER_ID = $1)
		LEFT JOIN PON.USER_TAG t ON (t.ID = a.TAG_ID)
		WHERE r.USER_ID = $1
		GROUP BY r.ID, r.USER_ID, r.ENABLED, r.INTERVAL_MINUTES, r.LAST_ACTIVITY_AT, r.CRON
		ORDER BY r.ID ASC
	`

	if err := db.SelectContext(ctx, &results, query, userID); err != nil {
		return err
	}

	data := make([]database.ReminderWithActivities, len(results))

	for i, res := range results {

		data[i].Reminder = res.TblUserReminder

		if res.Activities == nil {

			data[i].Activities = []database.ActivityWithTag{}

			continue
		}

		var rows [][]any

		if err := json.Unmarshal(res.Activities, &rows); err != nil {
			return err
		}

		activities := make([]database.ActivityWithTag, len(rows))

		for j, row := range rows {

			tagID := int(row[2].(float64))

			activities[j] = database.ActivityWithTag{
				Activity: database.TblUserActivity{
					ID:       int(row[0].(float64)),
					UserID:   userID,
					Name:     row[1].(string),
					TagID:    tagID,
					Duration: int(row[3].(float64)),
					Note:     row[4].(string),
				},
				Tag: database.TblUserTag{
					ID:        tagID,
					UserID:    userID,
					Namespace: row[5].(string),
					Name:      row[6].(string),
				},
			}
		}

		sort.Slice(activities, func(a, b int) bool {
			return activities[a].Activity.ID < activities[b].Activity.ID
		})

		data[i].Activities = activities
	}

	*out = data

	return nil
}

func (db *PGDatabase) SetUserReminderActivities(
	ctx context.Context,
	userID, reminderID int,
	activityIDs []int,
) error {
	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		// Make sure the UserID has the ReminderID, since the caller can't verify this.
		query := `SELECT COUNT(ID) FROM PON.USER_REMINDER WHERE USER_ID = $1 AND ID = $2 LIMIT 1`

		if ok, err := db.CountOneTx(tx, query, userID, reminderID); err != nil {
			return err
		} else if !ok {
			return database.ErrUserDoesNotHaveThisID
		}

		return db.SetUserReminderActivitiesTx(tx, userID, reminderID, activityIDs)
	})
}

func (db *PGDatabase) SetUserReminderActivitiesTx(
	tx *sqlx.Tx,
	userID, reminderID int,
	activityIDs []int,
) error {

	if len(activityIDs) > 0 {

		// Make sure every activityID actually belongs to userID, since the caller can't verify this.
		query := `SELECT COUNT(ID) FROM PON.USER_ACTIVITY WHERE USER_ID = $1 AND ID = ANY($2::integer[])`

		var count int

		if err := tx.Get(&count, query, userID, activityIDs); err != nil {
			return err
		}

		if count != len(activityIDs) {
			return database.ErrUserDoesNotHaveThisID
		}
	}

	query := `DELETE FROM PON.USER_REMINDER_ACTIVITY WHERE REMINDER_ID = $1`

	if _, err := tx.Exec(query, reminderID); err != nil {
		return err
	}

	if len(activityIDs) == 0 {
		return nil
	}

	query = `
			INSERT INTO PON.USER_REMINDER_ACTIVITY (
				reminder_id, activity_id
			) VALUES (
				$1, unnest($2::integer[])
			)
		`

	if _, err := tx.Exec(query, reminderID, activityIDs); err != nil {
		return err
	}

	return nil
}
