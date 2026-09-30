#!/bin/sh
# Runs ONCE, when the database is first created.
# Creates `umove_app`, the least-privilege account the app connects with:
# it can read and write rows, but cannot create, alter or drop tables,
# so a bug or an injection in the app cannot destroy the schema.
set -eu

psql -v ON_ERROR_STOP=1 -v app_pw="$APP_DB_PASSWORD" \
  --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
CREATE ROLE umove_app LOGIN PASSWORD :'app_pw';

REVOKE ALL ON DATABASE umove FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE umove TO umove_app;
GRANT USAGE ON SCHEMA public TO umove_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO umove_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO umove_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO umove_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO umove_app;

ALTER ROLE umove_app SET statement_timeout = '5s';
ALTER ROLE umove_app SET idle_in_transaction_session_timeout = '10s';
SQL

# The audit log is append-only for the app: it can add entries, never
# change or delete them.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
REVOKE UPDATE, DELETE ON audit_log FROM umove_app;
SQL
