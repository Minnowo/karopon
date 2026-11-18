-- Photo upload was removed. Drop both photo
-- tables and the photos in them; event logs are not touched.
DROP TABLE IF EXISTS PON_USER_EVENTLOG_PHOTO;
DROP TABLE IF EXISTS PON_USER_PHOTO;
