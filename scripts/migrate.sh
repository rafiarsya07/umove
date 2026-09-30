#!/usr/bin/env bash
# UMOVE: apply database changes (db/migrations/*.sql) that have not run yet.
# Each file runs once, inside a transaction, as the database owner.
# Called by install.sh and update.sh; safe to run again at any time.
set -euo pipefail
cd "$(dirname "$0")/.."

psqlc() { docker compose exec -T db psql -v ON_ERROR_STOP=1 -q -U umove -d umove "$@"; }

psqlc -c "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())"

for f in db/migrations/*.sql; do
  [ -e "$f" ] || continue
  name=$(basename "$f")
  case "$name" in *[!A-Za-z0-9._-]*) echo "Skipping odd file name: $name" >&2; continue;; esac
  if [ "$(psqlc -tAc "SELECT 1 FROM schema_migrations WHERE name = '$name'")" = "1" ]; then continue; fi
  echo "Applying database change: $name"
  { echo "BEGIN;"; cat "$f"; echo; echo "INSERT INTO schema_migrations (name) VALUES ('$name');"; echo "COMMIT;"; } | psqlc
done
