



/*
For some reason I had manually deleted food logs before
but now we're just gonna change the constraint.

I don't think it ever makes sense to have a null EVENTLOG_ID so we're adding a NOT NULL constraint too.
*/
ALTER TABLE PON.USER_FOODLOG
DROP CONSTRAINT IF EXISTS user_foodlog_eventlog_id_fkey;

ALTER TABLE PON.USER_FOODLOG
ADD CONSTRAINT user_foodlog_eventlog_id_fkey
FOREIGN KEY (EVENTLOG_ID) REFERENCES PON.USER_EVENTLOG(ID)
ON DELETE CASCADE;

DELETE FROM PON.USER_FOODLOG
WHERE EVENTLOG_ID IS NULL;

ALTER TABLE PON.USER_FOODLOG
ALTER COLUMN EVENTLOG_ID SET NOT NULL;


/*
This column is not useful and can be removed.
*/
ALTER TABLE PON.USER_FOODLOG
DROP COLUMN EVENT_ID;



