package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"karopon/src/database"

	"github.com/jmoiron/sqlx"
)

func (db *PGDatabase) AddUserTimespan(ctx context.Context, ts *database.TblUserTimespan, tags []database.TblUserTag) (int, error) {

	var timespanId int

	err := db.WithTx(ctx, func(tx *sqlx.Tx) error {

		query := `
			INSERT INTO PON.USER_TIMESPAN (
				user_id, start_time, stop_time, note
			) VALUES (
				:user_id, :start_time, :stop_time, :note
			) RETURNING id
		`

		id, err := db.NamedInsertReturningIDTx(tx, query, ts)

		if err != nil {
			return err
		}

		if len(tags) > 0 {

			if err := db.SetUserTimespanTagsTx(tx, ts.UserID, id, tags); err != nil {
				return err
			}
		}

		timespanId = id

		return nil
	})

	return timespanId, err
}

func (db *PGDatabase) DeleteUserTimespan(ctx context.Context, userId int, tsId int) error {

	query := `DELETE FROM PON.USER_TIMESPAN WHERE USER_ID = $1 AND ID = $2`

	_, err := db.ExecContext(ctx, query, userId, tsId)

	return err
}

func (db *PGDatabase) UpdateUserTimespan(ctx context.Context, ts *database.TblUserTimespan) error {
	query := `
		UPDATE PON.USER_TIMESPAN
		SET
			START_TIME = :start_time,
			STOP_TIME = :stop_time,
			NOTE = :note
		WHERE ID = :id AND USER_ID = :user_id
	`

	_, err := db.NamedExecContext(ctx, query, ts)

	return err
}

func (db *PGDatabase) LoadUserTimespans(ctx context.Context, userId int, out *[]database.TblUserTimespan) error {
	query := `
		SELECT * FROM PON.USER_TIMESPAN
		WHERE USER_ID = $1
		ORDER BY START_TIME DESC
	`

	return db.SelectContext(ctx, out, query, userId)
}

func (db *PGDatabase) LoadUserTimespansWithTags(ctx context.Context, userId int, out *[]database.TaggedTimespan) error {

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
		        ELSE jsonb_agg(jsonb_build_array(utag.ID, utag.NAMESPACE, utag.NAME))
		    END AS tags
		FROM PON.USER_TIMESPAN ut
		LEFT JOIN PON.USER_TIMESPAN_TAG utt
		ON (
			ut.USER_ID = $1
			AND utt.TIMESPAN_ID = ut.ID
		)
		LEFT JOIN PON.USER_TAG utag
		ON (
			utag.USER_ID = $1
			AND utt.TAG_ID = utag.ID
		)
		GROUP BY ut.ID, ut.USER_ID, ut.CREATED, ut.START_TIME, ut.STOP_TIME, ut.NOTE
		ORDER BY ut.START_TIME DESC;
	`

	err := db.SelectContext(ctx, &results, query, userId)

	if err != nil {
		return err
	}

	data := make([]database.TaggedTimespan, len(results))

	for i, res := range results {

		data[i].Timespan = res.TblUserTimespan

		if res.Tags == nil {

			data[i].Tags = []database.TblUserTag{}

			continue
		}

		var tags [][]any

		if err := json.Unmarshal(res.Tags, &tags); err != nil {
			return err
		}

		data[i].Tags = make([]database.TblUserTag, len(tags))

		for j, tag := range tags {
			data[i].Tags[j].UserID = userId
			data[i].Tags[j].ID = int(tag[0].(float64))
			data[i].Tags[j].Namespace = tag[1].(string)
			data[i].Tags[j].Name = tag[2].(string)
		}
	}

	*out = data

	return err
}

func (db *PGDatabase) SetUserTimespanTags(ctx context.Context, userId, timespanId int, tags []database.TblUserTag) error {
	return db.WithTx(ctx, func(tx *sqlx.Tx) error {

		// Make sure the UserID has the TimespanID, since the caller can't verify this.
		query := `SELECT COUNT(ID) FROM PON.USER_TIMESPAN WHERE USER_ID = $1 AND ID = $2 LIMIT 1`

		if ok, err := db.CountOneTx(tx, query, userId, timespanId); err != nil {
			return err
		} else if !ok {
			return fmt.Errorf("Timespan with ID %d does not exist", timespanId)
		}

		return db.SetUserTimespanTagsTx(tx, userId, timespanId, tags)
	})
}

func (db *PGDatabase) SetUserTimespanTagsTx(tx *sqlx.Tx, userId, timespanId int, tags []database.TblUserTag) error {

	var query string

	query = `
			WITH
			inTags(user_id, namespace, name) AS (
				SELECT $1::integer, * FROM unnest($2::varchar(128)[], $3::varchar(128)[])
			),
			newTags(id) AS (
				INSERT INTO PON.USER_TAG (user_id, namespace, name)
				SELECT * FROM inTags
				ON CONFLICT (user_id, namespace, name) DO NOTHING
				RETURNING id
			)
			SELECT id FROM newTags
				UNION ALL
			SELECT t.id FROM PON.USER_TAG t
			INNER JOIN inTags i
			ON (
				t.user_id = i.user_id
				AND t.namespace = i.namespace
			 	AND t.name = i.name
		 	)
		`

	var tagIds []int
	{
		namespaces := make([]string, len(tags))
		names := make([]string, len(tags))

		for i, t := range tags {
			namespaces[i] = t.Namespace
			names[i] = t.Name
		}

		err := tx.Select(&tagIds, query, userId, namespaces, names)

		if err != nil {
			return err
		}
	}

	query = `DELETE FROM PON.USER_TIMESPAN_TAG WHERE TIMESPAN_ID = $1`

	if _, err := tx.Exec(query, timespanId); err != nil {
		return err
	}

	query = `
			INSERT INTO PON.USER_TIMESPAN_TAG (
				timespan_id, tag_id
			) VALUES (
				$1, unnest($2::integer[])
			)
		`

	if _, err := tx.Exec(query, timespanId, tagIds); err != nil {
		return err
	}

	return nil
}
