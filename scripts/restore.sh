#!/usr/bin/env bash
# UMOVE: put a backup back into the live database. Use only when data is lost
# or broken; everything since the backup is replaced.
#
#   bash scripts/restore.sh backups/umove-20261001-0330.sql.gz
#   bash scripts/restore.sh ~/Downloads/umove-20261001-0330.sql.gz.enc   (from Telegram)
#
# A backup of the current state is taken first, so a restore can be undone.
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."
. scripts/lib.sh
SRC=${1:-}
[ -f "$SRC" ] || { echo "Usage: bash scripts/restore.sh <backup file>"; exit 1; }

TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
case "$SRC" in
  *.enc)
    PASS=$(envval BACKUP_PASSPHRASE)
    [ -n "$PASS" ] || read -rsp "BACKUP_PASSPHRASE: " PASS && echo
    UMOVE_BP="$PASS" openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:UMOVE_BP -in "$SRC" -out "$TMP" \
      || { echo "Wrong passphrase or damaged file."; exit 1; } ;;
  *) cp "$SRC" "$TMP" ;;
esac
gzip -t "$TMP" 2>/dev/null || { echo "Not a valid backup (gzip check failed)."; exit 1; }
zcat "$TMP" | tail -n 5 | grep -q "PostgreSQL database dump complete" || { echo "Backup is incomplete."; exit 1; }

echo "This REPLACES the live UMOVE database with: $SRC"
read -rp "Type RESTORE to continue: " ok
[ "$ok" = "RESTORE" ] || { echo "Cancelled."; exit 1; }

echo "1/4 Backing up the current state first..."
bash scripts/backup.sh --local
echo "2/4 Stopping the app..."
docker compose stop app
echo "3/4 Restoring..."
docker compose exec -T db psql -v ON_ERROR_STOP=1 -q -U umove -d postgres <<'SQL'
DROP DATABASE IF EXISTS umove WITH (FORCE);
CREATE DATABASE umove OWNER umove;
REVOKE ALL ON DATABASE umove FROM PUBLIC;
GRANT CONNECT ON DATABASE umove TO umove_app;
SQL
zcat "$TMP" | docker compose exec -T db psql -v ON_ERROR_STOP=1 -q -U umove -d umove >/dev/null
docker compose exec -T db psql -v ON_ERROR_STOP=1 -q -U umove -d umove <<'SQL'
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO umove_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO umove_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO umove_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO umove_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO umove_app;
REVOKE UPDATE, DELETE ON audit_log FROM umove_app;
SQL
echo "4/4 Starting the app (and applying any newer database changes)..."
bash scripts/migrate.sh
docker compose up -d --wait app
tg_send "UMOVE: database dipulihkan dari backup $(basename "$SRC")."
echo "Restored. Open https://umove.rafiarsya.com and check."
