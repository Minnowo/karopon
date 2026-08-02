

-- The new goal table:
-- - remove the UNIQUE on NAME
-- - add a UNIQUE(USER_ID, NAME)
CREATE TABLE IF NOT EXISTS PON_USER_GOAL_NEW (
    ID                  INTEGER PRIMARY KEY AUTOINCREMENT,
    USER_ID             INTEGER NOT NULL,
    CREATED             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    NAME                TEXT NOT NULL,

    -- String values for this will be hard coded in Golang
    TARGET_VALUE        REAL NOT NULL,
    TARGET_COL          TEXT NOT NULL,
    AGGREGATION_TYPE    TEXT NOT NULL,
    VALUE_COMPARISON    TEXT NOT NULL,

    -- As of creating this, it's just a simple interval, [daily, weekly, etc]
    TIME_EXPR           TEXT NOT NULL,

    FOREIGN KEY (USER_ID) REFERENCES PON_USER(ID),

    UNIQUE (USER_ID, NAME)
);

-- Copy old data
INSERT INTO PON_USER_GOAL_NEW(ID, USER_ID, CREATED, NAME, TARGET_VALUE, TARGET_COL, AGGREGATION_TYPE, VALUE_COMPARISON, TIME_EXPR)
                       SELECT ID, USER_ID, CREATED, NAME, TARGET_VALUE, TARGET_COL, AGGREGATION_TYPE, VALUE_COMPARISON, TIME_EXPR
                       FROM PON_USER_GOAL;

-- Drop old table
DROP TABLE PON_USER_GOAL;

-- Replace it with the new table.
ALTER TABLE PON_USER_GOAL_NEW
RENAME TO PON_USER_GOAL;




