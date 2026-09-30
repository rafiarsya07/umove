#!/usr/bin/env bash
# UMOVE: redeploy the API automatically when new code is pushed to GitHub.
# The web part is deployed by Cloudflare on every push; this keeps the
# mini PC in step. Run it every 5 minutes from cron (crontab -e):
#   */5 * * * * cd /home/USER/umove && bash scripts/auto-update.sh >> backups/auto-update.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups
git fetch --quiet origin main
if [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ]; then exit 0; fi
echo "$(date -Is) new version $(git rev-parse --short origin/main), updating"
bash scripts/update.sh
