#!/usr/bin/env bash
# UMOVE: put your committed changes live, with a database backup first.
#
# Run on your laptop (Git Bash) in the repo after committing:
#
#   bash scripts/release.sh
#
# It pushes main (Cloudflare deploys the web), then on the mini PC backs up
# the database and updates the API (update.sh also runs new migrations).
set -euo pipefail
cd "$(dirname "$0")/.."
SSH_HOST=${UMOVE_SSH:-user@100.77.41.4}
say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
fail() { printf '\n\033[31mStopped: %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || fail "switch to main first (git checkout main)."
[ -z "$(git status --porcelain)" ] || fail "you have uncommitted changes. Commit them first: git add -A && git commit -m \"...\""
git fetch --quiet origin
git merge-base --is-ancestor origin/main HEAD || fail "GitHub has newer changes. Run git pull --rebase first."

CHANGES=$(git log --oneline origin/main..HEAD)
if [ -n "$CHANGES" ]; then
  say "These changes will go live:"
  echo "$CHANGES"
else
  say "Nothing new to push; the mini PC will still be backed up and brought up to date."
fi
read -rp $'\nGo live on umove.rafiarsya.com now? Type yes: ' ok
[ "$ok" = "yes" ] || fail "cancelled."

say "1/3 Web: pushing (Cloudflare deploys it in about a minute)"
git push origin main

say "2/3 API: backing up the database, then updating the mini PC"
ssh "$SSH_HOST" "cd ~/umove && bash scripts/backup.sh --local && bash scripts/update.sh"

say "3/3 Done. Open https://umove.rafiarsya.com in a private window and check it."
echo "Something wrong? Admin → Maintenance on, then see the playbook (Server dan data)."
