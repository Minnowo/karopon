package sqlite

import (
	"context"
	"encoding/json"
	"karopon/src/database"
	"sort"
	"strconv"
	"strings"

	"github.com/vinovest/sqlx"
)

func (db *SqliteDatabase) AddUserReminder(
	ctx context.Context,
	r *database.TblUserReminder,
	activityIDs []int,
) (int, error) {

	var reminderID int

	err := db.WithTx(ctx, func(tx *sqlx.Tx) error {

		query := `
			INSERT INTO PON_USER_REMINDER (
				USER_ID, ENABLED, INTERVAL_MINUTES, LAST_ACTIVITY_AT, CRON
			) VALUES (
				:USER_ID, :ENABLED, :INTERVAL_MINUTES, :LAST_ACTIVITY_AT, :CRON
			)
		`

		id, err := db.NamedInsertGetLastRowIDTx(tx, query, r)

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

func (db *SqliteDatabase) UpdateUserReminder(ctx context.Context, r *database.TblUserReminder) error {
	query := `
		UPDATE PON_USER_REMINDER
		SET
			ENABLED = :ENABLED,
			INTERVAL_MINUTES = :INTERVAL_MINUTES,
			LAST_ACTIVITY_AT = :LAST_ACTIVITY_AT,
			CRON = :CRON
		WHERE ID = :ID AND USER_ID = :USER_ID
	`

	_, err := db.NamedExecContext(ctx, query, r)

	return err
}

func (db *SqliteDatabase) DeleteUserReminder(ctx context.Context, userID int, reminderID int) error {

	query := `DELETE FROM PON_USER_REMINDER WHERE USER_ID = $1 AND ID = $2`

	_, err := db.ExecContext(ctx, query, userID, reminderID)

	return err
}

func (db *SqliteDatabase) LoadUserReminders(
	ctx context.Context,
	userID int,
	out *[]database.ReminderWithActivities,
) error {

	var results []struct {
		database.TblUserReminder
		Activities []byte `db:"activities"`
	}

	query := `
		SELECT
			r.ID, r.USER_ID, r.ENABLED, r.INTERVAL_MINUTES, r.LAST_ACTIVITY_AT, r.CRON,
			CASE
				WHEN COUNT(a.ID) = 0 THEN NULL
				ELSE json_group_array(
					json_array(a.ID, a.NAME, a.TAG_ID, a.DURATION, a.NOTE, t.NAMESPACE, t.NAME)
				)
			END AS ACTIVITIES
		FROM PON_USER_REMINDER r
		LEFT JOIN PON_USER_REMINDER_ACTIVITY ra
		ON (
			ra.REMINDER_ID = r.ID
		)
		LEFT JOIN PON_USER_ACTIVITY a
		ON (
			a.ID = ra.ACTIVITY_ID
			AND a.USER_ID = $1
		)
		LEFT JOIN PON_USER_TAG t
		ON (
			t.ID = a.TAG_ID
		)
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

func (db *SqliteDatabase) SetUserReminderActivities(
	ctx context.Context,
	userID, reminderID int,
	activityIDs []int,
) error {
	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		// Make sure the UserID has the ReminderID, since the caller can't verify this.
		query := `SELECT COUNT(ID) FROM PON_USER_REMINDER WHERE USER_ID = $1 AND ID = $2 LIMIT 1`

		if ok, err := db.CountOneTx(tx, query, userID, reminderID); err != nil {
			return err
		} else if !ok {
			return database.ErrUserDoesNotHaveThisID
		}

		return db.SetUserReminderActivitiesTx(tx, userID, reminderID, activityIDs)
	})
}

func (db *SqliteDatabase) SetUserReminderActivitiesTx(
	tx *sqlx.Tx,
	userID, reminderID int,
	activityIDs []int,
) error {

	if len(activityIDs) > 0 {

		// Make sure every activityID actually belongs to userID, since the caller can't verify this.
		var qbuilder strings.Builder
		qbuilder.WriteString(`SELECT COUNT(ID) FROM PON_USER_ACTIVITY WHERE USER_ID = $1 AND ID IN (`)
		for i := range activityIDs {
			if i > 0 {
				qbuilder.WriteByte(',')
			}
			qbuilder.WriteByte('$')
			qbuilder.WriteString(strconv.Itoa(i + 2))
		}
		qbuilder.WriteByte(')')

		params := make([]any, len(activityIDs)+1)
		params[0] = userID
		for i, id := range activityIDs {
			params[i+1] = id
		}

		var count int

		if err := tx.Get(&count, qbuilder.String(), params...); err != nil {
			return err
		}

		if count != len(activityIDs) {
			return database.ErrUserDoesNotHaveThisID
		}
	}

	query := `DELETE FROM PON_USER_REMINDER_ACTIVITY WHERE REMINDER_ID = $1`

	if _, err := tx.Exec(query, reminderID); err != nil {
		return err
	}

	for _, activityID := range activityIDs {

		query = `INSERT INTO PON_USER_REMINDER_ACTIVITY (REMINDER_ID, ACTIVITY_ID) VALUES ($1, $2)`

		if _, err := tx.Exec(query, reminderID, activityID); err != nil {
			return err
		}
	}

	return nil
}
