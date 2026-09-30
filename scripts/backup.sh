#!/usr/bin/env bash
# Back up the UMove database to backups/ (keeps the 14 newest).
# Files are readable by you only (they contain user data).
#
#   Manual:     ./scripts/backup.sh
#   Every day at 04:00 (crontab -e):
#     0 4 * * * cd /home/USER/umove && ./scripts/backup.sh >> backups/backup.log 2>&1
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."
mkdir -p backups
FILE="backups/umove-$(date +%Y%m%d-%H%M).sql.gz"
docker compose exec -T db pg_dump -U umove --no-owner umove | gzip > "$FILE"
echo "Backup saved: $FILE"
ls -1t backups/umove-*.sql.gz | tail -n +15 | xargs -r rm --
