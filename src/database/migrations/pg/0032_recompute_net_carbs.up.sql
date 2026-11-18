-- An event log's NET_CARBS must equal the sum of CARB - FIBRE over its food
-- logs (0 with none), as creating an event computes it. Edited events could
-- hold a different value, so recompute every row in one grouped pass.
UPDATE PON.USER_EVENTLOG SET NET_CARBS = 0;

UPDATE PON.USER_EVENTLOG e
SET NET_CARBS = s.TOTAL
FROM (
    SELECT EVENTLOG_ID, USER_ID, SUM(CARB - FIBRE) AS TOTAL
    FROM PON.USER_FOODLOG
    WHERE EVENTLOG_ID IS NOT NULL
    GROUP BY EVENTLOG_ID, USER_ID
) s
WHERE s.EVENTLOG_ID = e.ID AND s.USER_ID = e.USER_ID;
