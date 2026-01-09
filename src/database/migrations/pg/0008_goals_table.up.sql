
CREATE TABLE IF NOT EXISTS PON.USER_GOAL (
    ID                  SERIAL PRIMARY KEY,
    USER_ID             INTEGER NOT NULL REFERENCES PON.USER(ID),
    CREATED             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    NAME                VARCHAR(128) UNIQUE NOT NULL,

    -- String values for this will be hard coded in Folang
    TARGET_VALUE     FLOAT NOT NULL,        -- the value they're aiming for
    TARGET_COL       VARCHAR(64) NOT NULL, -- the column they want to target a value in, carbs, net carbs, etc
    AGGREGATION_TYPE VARCHAR(32) NOT NULL, -- SUM, AVG, MIN, MAX, etc, generates the current value
    VALUE_COMPARISON VARCHAR(32) NOT NULL, -- EQ, LESS_THAN, MORE_THAN, etc, how to cmpare the current value with the target value

    -- As of creating this, it's just a simple interval, [daily, weekly, etc]
    -- This might change in the future depending on what happens.
    TIME_EXPR VARCHAR(128) NOT NULL

);



