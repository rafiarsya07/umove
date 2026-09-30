#!/usr/bin/env bash
# UMove: pull the latest code and redeploy.
#   cd ~/umove && bash scripts/update.sh
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only
PORT_LOCAL=$(grep -s '^UMOVE_PORT=' .env | cut -d= -f2 || true); PORT_LOCAL=${PORT_LOCAL:-3100}
docker compose up -d --wait db
bash scripts/migrate.sh
docker compose up -d --build
docker image prune -f >/dev/null
for _ in $(seq 1 40); do
  if curl -fsS http://127.0.0.1:$PORT_LOCAL/api/health >/dev/null 2>&1; then echo "UMove updated and healthy."; exit 0; fi
  sleep 3
done
echo "UMove is not healthy yet. Check: docker compose logs app" >&2
exit 1
