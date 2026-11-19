-- A session length of 0 or less used to be saved as "1 year" computed in
-- nanoseconds, a value that overflows at login and makes every new session
-- already expired. Reset any length outside 1 hour to 10 years (the range the
-- server now accepts, constants.MIN/MAX_SESSION_EXPIRE_SECONDS) to the
-- default for new users, 10 days.
UPDATE PON.USER
SET SESSION_EXPIRE_TIME_SECONDS = 864000
WHERE SESSION_EXPIRE_TIME_SECONDS < 3600
   OR SESSION_EXPIRE_TIME_SECONDS > 315360000;
