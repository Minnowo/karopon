


CREATE TABLE IF NOT EXISTS PON.USER_BODYLOG (
    ID                         SERIAL PRIMARY KEY NOT NULL,
    USER_ID                    INTEGER NOT NULL REFERENCES PON.USER(ID),
    CREATED                    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    USER_TIME                  TIMESTAMP NOT NULL,

    -- Core metrics
    WEIGHT_KG                  FLOAT,
    HEIGHT_CM                  FLOAT,
    BODY_FAT_PERCENT           FLOAT,
    BMI                        FLOAT,

    -- Blood pressure & heart
    BP_SYSTOLIC                SMALLINT,
    BP_DIASTOLIC               SMALLINT,
    HEART_RATE_BPM             SMALLINT,

    -- Lifestyle data
    STEPS_COUNT                INTEGER
);


CREATE TABLE IF NOT EXISTS PON.USER_MEDICATION (
    ID                  SERIAL PRIMARY KEY,
    USER_ID             INTEGER NOT NULL REFERENCES PON.USER(ID),
    CREATED             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    NAME                VARCHAR(128) NOT NULL,
    CATEGORY            VARCHAR(64),
    DOSAGE_AMOUNT       FLOAT,
    DOSAGE_UNIT         VARCHAR(64),
    FORM                VARCHAR(64), -- tablet, capsule, liquid

    START_DATE          DATE, -- day the medication started
    END_DATE            DATE, -- day the medication end

    NOTES               TEXT
);


CREATE TABLE IF NOT EXISTS PON.USER_MEDICATION_SCHEDULE (
    ID                  SERIAL PRIMARY KEY,
    MEDICATION_ID       INTEGER NOT NULL REFERENCES PON.USER_MEDICATION(ID) ON DELETE CASCADE,
    CREATED             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- basically describing cron
    MINUTES_OF_HOUR_MASK  BIT(60),
    HOURS_OF_DAY_MASK     BIT(24),
    DAYS_OF_WEEK_MASK     BIT(7),  -- 0=none, 1=mon, 2=tue, etc
    DAYS_OF_MONTH_MASK    BIT(31), -- 0=none, 1=1st, 2=2nd, etc
    MONTH_OF_YEAR_MASK    BIT(12), -- 0=none, 1=jan, 2=feb, etc

    WITH_FOOD           BOOLEAN,
    FASTING             BOOLEAN,

    REMINDER_ENABLED    BOOLEAN DEFAULT TRUE,
    NOTES               TEXT
);


CREATE TABLE IF NOT EXISTS PON.USER_MEDICATIONLOG (
    ID                  SERIAL PRIMARY KEY,
    SCHEDULE_ID         INTEGER REFERENCES PON.USER_MEDICATION_SCHEDULE(ID),

    TAKEN_TIME          TIMESTAMP NOT NULL,
    TAKEN               BOOLEAN NOT NULL,

    NOTES               TEXT
);





