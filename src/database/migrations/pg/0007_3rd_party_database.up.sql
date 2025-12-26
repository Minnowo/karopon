
CREATE TABLE IF NOT EXISTS PON.DATA_SOURCE (
    ID                  SERIAL PRIMARY KEY,
    CREATED             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    NAME                VARCHAR(128) UNIQUE NOT NULL,
    URL                 VARCHAR(1024),

    NOTES               TEXT
);


CREATE TABLE IF NOT EXISTS PON.DATA_SOURCE_FOOD (
    ID                  SERIAL PRIMARY KEY,
    DATA_SOURCE_ID      INTEGER NOT NULL REFERENCES PON.DATA_SOURCE(ID) ON DELETE CASCADE,
    CREATED             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    NAME     VARCHAR(256) NOT NULL,
    UNIT     VARCHAR(64),
    PORTION  FLOAT  NOT NULL,
    PROTEIN  FLOAT  NOT NULL,
    CARB     FLOAT  NOT NULL,
    FIBRE    FLOAT  NOT NULL,
    FAT      FLOAT  NOT NULL,

    DATA_SOURCE_ROW_INT_ID INTEGER     -- FDC ID, ndbNumber, etc

);

CREATE INDEX IF NOT EXISTS idx_datasourcefood_foodname
ON PON.DATA_SOURCE_FOOD (DATA_SOURCE_ID, LOWER(NAME));

CREATE INDEX IF NOT EXISTS idx_datasourcefood_datasourcerowintid
ON PON.DATA_SOURCE_FOOD (DATA_SOURCE_ROW_INT_ID);


/*
Try adding trigram matching index: https://www.postgresql.org/docs/current/pgtrgm.html
*/
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_datasourcefood_foodname_trgm_gin
ON PON.DATA_SOURCE_FOOD USING gin (LOWER(NAME) gin_trgm_ops);

/*
Testing with GIST, might be better than GIN for our use case here.
*/
-- CREATE INDEX idx_datasourcefood_foodname_trgm_gist
-- ON PON.DATA_SOURCE_FOOD USING GIST (LOWER(NAME) gist_trgm_ops(siglen=128));







