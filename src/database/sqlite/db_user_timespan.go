package sqlite

import (
	"context"
	"encoding/json"
	"karopon/src/database"
	"strconv"
	"strings"

	"github.com/vinovest/sqlx"
)

func (db *SqliteDatabase) AddUserTimespan(
	ctx context.Context,
	ts *database.TblUserTimespan,
	tags []database.TblUserTag,
) (int, error) {

	var timespanID int

	err := db.WithTx(ctx, func(tx *sqlx.Tx) error {

		query := `
			INSERT INTO PON_USER_TIMESPAN (
				USER_ID, START_TIME, STOP_TIME, NOTE
			) VALUES (
				:USER_ID, :START_TIME, :STOP_TIME, :NOTE
			)
		`

		id, err := db.NamedInsertGetLastRowIDTx(tx, query, ts)

		if err != nil {
			return err
		}

		if len(tags) > 0 {

			if err := db.SetUserTimespanTagsTx(tx, ts.UserID, id, tags); err != nil {
				return err
			}
		}

		timespanID = id

		return nil
	})

	return timespanID, err
}

func (db *SqliteDatabase) DeleteUserTimespan(ctx context.Context, userID int, tsID int) error {

	query := `DELETE FROM PON_USER_TIMESPAN WHERE USER_ID = $1 AND ID = $2`

	_, err := db.ExecContext(ctx, query, userID, tsID)

	return err
}

func (db *SqliteDatabase) UpdateUserTimespan(ctx context.Context, ts *database.TblUserTimespan) error {
	query := `
		UPDATE PON_USER_TIMESPAN
		SET
			START_TIME = :start_time,
			STOP_TIME = :stop_time,
			NOTE = :note
		WHERE ID = :id AND USER_ID = :user_id
	`

	_, err := db.NamedExecContext(ctx, query, ts)

	return err
}

func (db *SqliteDatabase) LoadUserTimespans(ctx context.Context, userID int, out *[]database.TblUserTimespan) error {
	query := `
		SELECT * FROM PON_USER_TIMESPAN
		WHERE USER_ID = $1
		ORDER BY START_TIME DESC
	`

	return db.SelectContext(ctx, out, query, userID)
}

func (db *SqliteDatabase) LoadUserTimespansWithTags(
	ctx context.Context,
	userID int,
	out *[]database.TaggedTimespan,
) error {

	var results []struct {
		database.TblUserTimespan
		Tags []byte `db:"tags"`
	}

	query := `
		SELECT 
			ut.ID,
			ut.USER_ID,
			ut.CREATED,
			ut.START_TIME,
			ut.STOP_TIME,
			ut.NOTE,
			CASE 
		        WHEN COUNT(utag.ID) = 0 THEN NULL
		        ELSE json_group_array(
		            json_object('id', utag.ID, 'namespace', utag.NAMESPACE, 'name', utag.NAME)
		        )
		    END AS TAGS
		FROM PON_USER_TIMESPAN ut
		LEFT JOIN PON_USER_TIMESPAN_TAG utt
		ON (
			ut.USER_ID = $1  -- Use placeholder $1 for userID
			AND utt.TIMESPAN_ID = ut.ID
		)
		LEFT JOIN PON_USER_TAG utag
		ON (
			utag.USER_ID = $1  -- Use placeholder $1 for userID
			AND utt.TAG_ID = utag.ID
		)
		GROUP BY ut.ID, ut.USER_ID, ut.CREATED, ut.START_TIME, ut.STOP_TIME, ut.NOTE
		ORDER BY ut.START_TIME DESC;
	`

	err := db.SelectContext(ctx, &results, query, userID)

	if err != nil {
		return err
	}

	// Prepare the final output
	data := make([]database.TaggedTimespan, len(results))

	for i, res := range results {

		data[i].Timespan = res.TblUserTimespan

		if res.Tags == nil {
			// No tags
			data[i].Tags = []database.TblUserTag{}

			continue
		}

		// Unmarshal JSON array of tags
		var tags []map[string]any // JSON array of objects, each object has id, namespace, and name

		if err := json.Unmarshal(res.Tags, &tags); err != nil {
			return err
		}

		// Convert to database.TblUserTag structure
		data[i].Tags = make([]database.TblUserTag, len(tags))
		for j, tag := range tags {
			data[i].Tags[j].UserID = userID
			data[i].Tags[j].ID = int(tag["id"].(float64))
			data[i].Tags[j].Namespace = tag["namespace"].(string)
			data[i].Tags[j].Name = tag["name"].(string)
		}
	}

	*out = data

	return nil
}

func (db *SqliteDatabase) SetUserTimespanTags(
	ctx context.Context,
	userID, timespanID int,
	tags []database.TblUserTag,
) error {

	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		// Make sure the UserID has the TimespanID, since the caller can't verify this.
		query := `SELECT COUNT(ID) FROM PON_USER_TIMESPAN WHERE USER_ID = $1 AND ID = $2 LIMIT 1`

		if ok, err := db.CountOneTx(tx, query, userID, timespanID); err != nil {
			return err
		} else if !ok {
			return database.ErrUserDoesNotHaveThisID
		}

		return db.SetUserTimespanTagsTx(tx, userID, timespanID, tags)
	})
}

// func (db *SqliteDatabase) SetUserTimespanTagsTx(tx *sqlx.Tx, userID, timespanID int, tags []database.TblUserTag)
// error {

// 	var query string

// 	// Step 1: Create temporary table to hold tags data
// 	query = `CREATE TEMPORARY TABLE inTags(user_id INTEGER, namespace TEXT, name TEXT);`

// 	if _, err := tx.Exec(query); err != nil {
// 		return err
// 	}

// 	for _, t := range tags {

// 		// Step 2: Insert tag data into the temporary inTags table
// 		query = `INSERT INTO inTags (user_id, namespace, name) VALUES ($1, $2, $3);`

// 		if _, err := tx.Exec(query, userID, t.Namespace, t.Name); err != nil {
// 			return err
// 		}
// 	}

// 	// Step 3: Insert the tags into the PON.USER_TAG table (insert ignoring conflicts)
// 	query = `INSERT OR IGNORE INTO PON_USER_TAG (USER_ID, NAMESPACE, NAME) SELECT user_id, namespace, name FROM inTags;`

// 	if _, err := tx.Exec(query); err != nil {
// 		return err
// 	}

// 	// Step 4: Get the IDs of the new tags by joining the USER_TAG table with inTags
// 	query = `SELECT t.id FROM PON_USER_TAG t INNER JOIN inTags i ON t.user_id = i.user_id AND t.namespace = i.namespace
// AND t.name = i.name;`

// 	var tagIDs []int
// 	if err := tx.Select(&tagIDs, query); err != nil {
// 		return err
// 	}

// 	// Step 5: Delete existing timespan tags for the given timespanID
// 	query = `DELETE FROM PON_USER_TIMESPAN_TAG WHERE TIMESPAN_ID = $1`

// 	if _, err := tx.Exec(query, timespanID); err != nil {
// 		return err
// 	}

// 	// Step 6: Insert new timespan-tag mappings
// 	for _, tagID := range tagIDs {

// 		query = `INSERT INTO PON_USER_TIMESPAN_TAG (timespan_id, tag_id) VALUES ($1, $2);`
// 		if _, err := tx.Exec(query, timespanID, tagID); err != nil {
// 			return err
// 		}
// 	}

// 	return nil
// }

func (db *SqliteDatabase) SetUserTimespanTagsTx(tx *sqlx.Tx, userID, timespanID int, tags []database.TblUserTag) error {

	var query string

	// Step 1: Insert the tags into the USER_TAG table (insert ignoring conflicts)
	for _, t := range tags {

		query = `INSERT OR IGNORE INTO PON_USER_TAG (USER_ID, NAMESPACE, NAME) VALUES ($1, $2, $3);`

		if _, err := tx.Exec(query, userID, t.Namespace, t.Name); err != nil {
			return err
		}
	}

	// Step 2: Get the IDs of the new tags by selecting from USER_TAG table
	// Get the tag IDs for the tags inserted or already existing
	var tagIDs []int
	{
		var qbuilder strings.Builder
		qbuilder.WriteString(`SELECT t.id FROM PON_USER_TAG t WHERE t.user_id = $1 AND (t.namespace || t.name) IN (`)
		for i := range tags {
			if i > 0 {
				qbuilder.WriteByte(',')
			}
			qbuilder.WriteByte('$')
			qbuilder.WriteString(strconv.Itoa(i + 2))
		}
		qbuilder.WriteByte(')')

		// Prepare the slice of params from the tags
		params := make([]any, len(tags)+1)
		params[0] = userID
		for i, t := range tags {
			params[i+1] = t.Namespace + t.Name
		}

		query = qbuilder.String()
		if err := tx.Select(&tagIDs, query, params...); err != nil {
			return err
		}
	}

	// Step 3: Delete existing timespan-tag mappings for the given timespanID
	query = `DELETE FROM PON_USER_TIMESPAN_TAG WHERE TIMESPAN_ID = $1`

	if _, err := tx.Exec(query, timespanID); err != nil {
		return err
	}

	// Step 4: Insert new timespan-tag mappings
	for _, tagID := range tagIDs {

		query = `INSERT INTO PON_USER_TIMESPAN_TAG (timespan_id, tag_id) VALUES ($1, $2);`

		if _, err := tx.Exec(query, timespanID, tagID); err != nil {
			return err
		}
	}

	return nil
}
