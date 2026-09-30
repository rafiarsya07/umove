#!/usr/bin/env bash
# UMOVE: release what you tested on the demo copy to production.
#
# Run on your laptop (Git Bash) in the repo, on branch demo, after the change
# looked right on https://umove-demo.rafiarsya.com:
#
#   bash scripts/release.sh
#
# It moves main to the tested demo commit (fast-forward only, nothing else
# sneaks in), pushes it (Cloudflare deploys the web), then on the mini PC
# backs up the production database and updates the API.
set -euo pipefail
cd "$(dirname "$0")/.."
SSH_HOST=${UMOVE_SSH:-user@100.77.41.4}
say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
fail() { printf '\n\033[31mStopped: %s\033[0m\n' "$*" >&2; exit 1; }

[ -z "$(git status --porcelain)" ] || fail "you have uncommitted changes. Commit them to demo (and test them) first."
git fetch --quiet origin
[ "$(git rev-parse demo)" = "$(git rev-parse origin/demo)" ] || fail "push demo first (git push origin demo), then test it on the demo site."
git merge-base --is-ancestor origin/main origin/demo || fail "main has changes that demo doesn't. Merge main into demo, test, then release."

CHANGES=$(git log --oneline origin/main..origin/demo)
[ -n "$CHANGES" ] || { echo "Production already has everything on demo."; exit 0; }
say "These changes will go to production:"
echo "$CHANGES"
read -rp $'\nRelease to umove.rafiarsya.com now? Type yes: ' ok
[ "$ok" = "yes" ] || fail "cancelled."

say "1/3 Web: pushing main (Cloudflare deploys it in about a minute)"
git push origin origin/demo:main

say "2/3 API: backing up the production database, then updating the mini PC"
ssh "$SSH_HOST" "cd ~/umove && bash scripts/backup.sh && bash scripts/update.sh"

say "3/3 Done. Open https://umove.rafiarsya.com in a private window and check it."
echo "Something wrong? See docs/DEMO.md → Undo a release."
