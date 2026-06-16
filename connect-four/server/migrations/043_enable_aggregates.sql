-- Migration 043: Enable PostgREST aggregate functions
-- Required for SELECT ... count() queries via the Data API.

ALTER ROLE authenticator SET pgrst.db_aggregates_enabled = 'true';
NOTIFY pgrst, 'reload config';
