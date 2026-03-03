
/*
For some reason I had manually deleted food logs before
but now we're just gonna change the constraint.

I don't think it ever makes sense to have a null EVENTLOG_ID so we're adding a NOT NULL constraint too.

Also removing the EVENT_ID column, which isn't used and just makes the code harder to work with.
*/
DELETE FROM PON_USER_FOODLOG
WHERE EVENTLOG_ID IS NULL;

-- SQLite doesn't support altering the table, so we're going to just make a new table.
-- New table without EVENT_ID and with a NOT NULL ON DELETE CASCADE EVENTLOG_ID.
CREATE TABLE PON_USER_FOODLOG_TMP (
    ID          INTEGER PRIMARY KEY AUTOINCREMENT,
    USER_ID     INTEGER NOT NULL,
    EVENTLOG_ID INTEGER NOT NULL, -- moving this here because it's more fitting
    FOOD_ID     INTEGER,
    CREATED     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    USER_TIME   TIMESTAMP NOT NULL,
    NAME        TEXT NOT NULL,
    EVENT       TEXT NOT NULL,
    UNIT        TEXT NOT NULL,
    PORTION     REAL NOT NULL,
    PROTEIN     REAL NOT NULL,
    CARB        REAL NOT NULL,
    FIBRE       REAL NOT NULL,
    FAT         REAL NOT NULL,
    FOREIGN KEY (USER_ID) REFERENCES PON_USER(ID),
    FOREIGN KEY (FOOD_ID) REFERENCES PON_USER_FOOD(ID) ON DELETE SET NULL,
    FOREIGN KEY (EVENTLOG_ID) REFERENCES PON_USER_EVENTLOG(ID) ON DELETE CASCADE
);

-- Copy the old table data to the new table.
INSERT INTO 
PON_USER_FOODLOG_TMP(ID, USER_ID, EVENTLOG_ID, FOOD_ID, CREATED, USER_TIME, NAME, EVENT, UNIT, PORTION, PROTEIN, CARB, FIBRE, FAT)
              SELECT ID, USER_ID, EVENTLOG_ID, FOOD_ID, CREATED, USER_TIME, NAME, EVENT, UNIT, PORTION, PROTEIN, CARB, FIBRE, FAT
              FROM PON_USER_FOODLOG;

-- Delete the existing table.
DROP TABLE PON_USER_FOODLOG;

-- Replace it with the new table.
ALTER TABLE PON_USER_FOODLOG_TMP
RENAME TO PON_USER_FOODLOG;

