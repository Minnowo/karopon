-- Photo upload was removed. Drop both photo
-- tables and the photos in them; event logs are not touched.
DROP TABLE IF EXISTS PON.USER_EVENTLOG_PHOTO;
DROP TABLE IF EXISTS PON.USER_PHOTO;
