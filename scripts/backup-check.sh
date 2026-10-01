#!/usr/bin/env bash
# UMOVE: prove the newest backup can really be restored (weekly, automatic).
# Restores it into a throwaway database next to the live one, counts the
# rows, compares with live, then deletes the copy. The live site is untouched.
# You get a Telegram message either way: a backup you never tested is a hope,
# not a backup.
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."
. scripts/lib.sh
LATEST=$(ls -1t backups/umove-*.sql.gz 2>/dev/null | head -n1 || true)
[ -n "$LATEST" ] || { tg_send "UMOVE: tes backup GAGAL, tidak ada file backup."; exit 1; }

q() { docker compose exec -T db psql -v ON_ERROR_STOP=1 -qtA -U umove "$@"; }
cleanup() { q -d postgres -c "DROP DATABASE IF EXISTS umove_check WITH (FORCE)" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup
q -d postgres -c "CREATE DATABASE umove_check OWNER umove" >/dev/null
if ! zcat "$LATEST" | q -d umove_check >/dev/null 2>/tmp/umove-check.err; then
  tg_send "UMOVE: tes backup GAGAL ($(basename "$LATEST") tidak bisa dipulihkan). $(head -c 200 /tmp/umove-check.err)"
  exit 1
fi
CU=$(q -d umove_check -c "select count(*) from users"); CO=$(q -d umove_check -c "select count(*) from orders")
LU=$(q -d umove -c "select count(*) from users");      LO=$(q -d umove -c "select count(*) from orders")
MSG="UMOVE: tes backup OK. $(basename "$LATEST") bisa dipulihkan: $CU pengguna, $CO permintaan (live sekarang: $LU / $LO)."
echo "$MSG"
tg_send "$MSG"
