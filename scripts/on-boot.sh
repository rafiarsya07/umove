#!/usr/bin/env bash
# UMOVE: runs once after the mini PC starts (power cut, update reboot, crash).
# Docker brings the containers back by itself (restart: unless-stopped); this
# waits until the API answers and tells the admins on Telegram, so you know
# the server went down and came back, or that it did NOT come back.
set -uo pipefail
cd "$(dirname "$0")/.."
. scripts/lib.sh
PORT_LOCAL=$(envval UMOVE_PORT); PORT_LOCAL=${PORT_LOCAL:-3100}
sleep 20
docker compose up -d >/dev/null 2>&1 || true
for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:$PORT_LOCAL/api/health" >/dev/null 2>&1; then
    tg_send "UMOVE: mini PC baru menyala lagi ($(date '+%d %b %H:%M')) dan web sudah normal."
    exit 0
  fi
  sleep 5
done
tg_send "UMOVE: mini PC menyala lagi tapi web BELUM normal setelah 5 menit. Cek: docker compose logs app"
