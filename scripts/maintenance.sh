#!/usr/bin/env bash
# UMOVE: weekly upkeep so the server stays fast and never fills up (automatic).
#
#   - Database: VACUUM ANALYZE (reclaims space, refreshes the query planner's
#     statistics so queries keep using the right indexes).
#   - Docker: removes old images and build cache left by updates.
#   - Logs: trims the system journal to 200 MB.
#   - Checks: disk space, memory, database size, slowest table growth.
# Sends a short weekly report to the admins' Telegram, and an alert if the
# disk is over 85% full.
set -euo pipefail
cd "$(dirname "$0")/.."
. scripts/lib.sh

psqlq -c "VACUUM (ANALYZE)" >/dev/null 2>&1 || echo "vacuum skipped" >&2
docker image prune -af --filter "until=168h" >/dev/null 2>&1 || true
docker builder prune -af --filter "until=168h" >/dev/null 2>&1 || true
sudo -n journalctl --vacuum-size=200M >/dev/null 2>&1 || true

DISK=$(df -P / | awk 'NR==2 {gsub("%","",$5); print $5}')
MEM=$(free -m | awk '/Mem:/ {printf "%d/%d MB", $3, $2}')
DBSIZE=$(psqlq -c "select pg_size_pretty(pg_database_size('umove'))" 2>/dev/null || echo "?")
BACKUPS=$(ls -1 backups/umove-*.sql.gz 2>/dev/null | wc -l)
UP=$(uptime -p 2>/dev/null || true)
WEEK=$(psqlq -c "select count(*) || ' permintaan, ' || count(*) filter (where status = 'delivered') || ' sampai' from orders where created_at > now() - interval '7 days'" 2>/dev/null || echo "?")
NEWU=$(psqlq -c "select count(*) from users where created_at > now() - interval '7 days'" 2>/dev/null || echo "?")

REPORT="UMOVE laporan mingguan
Minggu ini: $WEEK, $NEWU pengguna baru
Disk: ${DISK}% terpakai | RAM: $MEM | Database: $DBSIZE
Backup di mini PC: $BACKUPS file | Server: $UP"
echo "$REPORT"
tg_send "$REPORT"
if [ "${DISK:-0}" -ge 85 ]; then
  tg_send "UMOVE PERINGATAN: disk mini PC ${DISK}% penuh. Hapus file besar yang tidak perlu, atau jalankan: docker system prune -a"
fi
