#!/usr/bin/env bash
# UMOVE: back up the database, check the backup, and keep a copy OFF the mini PC.
#
#   Manual:  bash scripts/backup.sh
#   Daily:   installed by scripts/setup-automation.sh (03:30 every night)
#
# 1. pg_dump → backups/umove-YYYYMMDD-HHMM.sql.gz (readable by you only)
# 2. Checks the file is complete (gzip OK + "dump complete" marker), or alerts you.
# 3. Keeps the 14 newest daily backups, plus one per week for 8 weeks (backups/weekly/).
# 4. Off-site copy: encrypts it with BACKUP_PASSPHRASE (AES-256) and sends it to
#    the admins' Telegram. If the mini PC's disk dies, your data is still safe.
#    Without the passphrase the file is useless, so a leaked copy reveals nothing.
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."
. scripts/lib.sh
mkdir -p backups/weekly

STAMP=$(date +%Y%m%d-%H%M)
FILE="backups/umove-$STAMP.sql.gz"

fail() {
  echo "$(date -Is) BACKUP FAILED: $*" >&2
  tg_send "UMOVE: backup GAGAL ($*). Cek di mini PC: bash scripts/backup.sh"
  rm -f "$FILE"
  exit 1
}

docker compose exec -T db pg_dump -U umove --no-owner umove | gzip -9 > "$FILE" || fail "pg_dump error"
gzip -t "$FILE" || fail "file rusak"
zcat "$FILE" | tail -n 5 | grep -q "PostgreSQL database dump complete" || fail "dump tidak lengkap"
SIZE=$(du -h "$FILE" | cut -f1)
echo "$(date -Is) Backup saved: $FILE ($SIZE)"

# Weekly copy on Sundays, kept 8 weeks.
if [ "$(date +%u)" = "7" ]; then cp "$FILE" backups/weekly/; fi
{ ls -1t backups/umove-*.sql.gz 2>/dev/null || true; } | tail -n +15 | xargs -r rm --
{ ls -1t backups/weekly/umove-*.sql.gz 2>/dev/null || true; } | tail -n +9 | xargs -r rm --

# Off-site copy (skipped when called with --local, e.g. right before a release).
[ "${1:-}" = "--local" ] && exit 0
PASS=$(envval BACKUP_PASSPHRASE)
if [ -z "$PASS" ] || [ -z "$(envval TELEGRAM_BOT_TOKEN)" ]; then
  echo "Off-site copy skipped: set BACKUP_PASSPHRASE and TELEGRAM_BOT_TOKEN in .env (see docs/SETUP.md)."
  exit 0
fi
ENC="$FILE.enc"
UMOVE_BP="$PASS" openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass env:UMOVE_BP -in "$FILE" -out "$ENC" ||
  fail "enkripsi gagal"
BYTES=$(stat -c %s "$ENC")
if [ "$BYTES" -gt 49000000 ]; then
  rm -f "$ENC"
  tg_send "UMOVE: backup $STAMP ($SIZE) tersimpan di mini PC, tapi terlalu besar untuk Telegram (maks 50 MB). Saatnya pindah ke Google Drive (lihat SETUP.md)."
  exit 0
fi
USERS=$(psqlq -c "select count(*) from users" 2>/dev/null || echo "?")
ORDERS=$(psqlq -c "select count(*) from orders" 2>/dev/null || echo "?")
if tg_file "$ENC" "UMOVE backup $STAMP ($SIZE): $USERS pengguna, $ORDERS permintaan. Terenkripsi; buka dengan BACKUP_PASSPHRASE (scripts/restore.sh)."; then
  echo "Off-site copy sent to Telegram."
else
  echo "Off-site copy could not be sent (is Telegram connected in Admin → Overview?)." >&2
fi
rm -f "$ENC"
