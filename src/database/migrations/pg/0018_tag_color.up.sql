CREATE TABLE IF NOT EXISTS PON.USER_TAG_COLOR (
    user_id   INTEGER NOT NULL,
    namespace TEXT    NOT NULL,
    color     TEXT    NOT NULL,
    PRIMARY KEY (user_id, namespace),
    FOREIGN KEY (user_id) REFERENCES PON.USER(id)
);
