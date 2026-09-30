#!/usr/bin/env bash
# UMOVE: first-time setup on the mini PC.
#
#   cd ~/umove && bash scripts/install.sh
#
# Creates .env (random database passwords + the keys you paste in),
# builds and starts everything, and waits until UMove is healthy.
# Safe to run again: an existing .env is kept.
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
fail() { printf '\n\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

[ -f docker-compose.yml ] || fail "Run this from the UMOVE folder."
[ "$(id -u)" -ne 0 ] || fail "Run as your normal user, not root."

# --- Docker ---------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  say "Docker is not installed. Installing it (needs your sudo password)..."
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  fail "Docker installed. Log out and back in, then run this script again."
fi
docker info >/dev/null 2>&1 || fail "Can't talk to Docker. Log out and back in (or run: newgrp docker), then try again."
docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin missing: sudo apt install docker-compose-plugin"

# --- .env -----------------------------------------------------------------
gen() { head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 40; }

ask() { # ask VAR "Question" [secret] [optional] [default]
  local var=$1 q=$2 secret=${3:-} optional=${4:-} def=${5:-} val=""
  [ -n "$def" ] && q="$q [$def]"
  while :; do
    if [ -n "$secret" ]; then read -rsp "$q: " val; echo; else read -rp "$q: " val; fi
    val=$(printf '%s' "$val" | tr -d '[:space:]')
    [ -z "$val" ] && val=$def
    [ -n "$val" ] || [ -n "$optional" ] && break
    echo "  (required)"
  done
  printf -v "$var" '%s' "$val"
}

if [ -f .env ]; then
  say "Keeping your existing .env"
  if ! grep -q '^PROXY_SECRET=.\{32,\}' .env; then
    sed -i '/^PROXY_SECRET=/d' .env
    echo "PROXY_SECRET=$(gen)$(gen)" >> .env
    echo "  Added a new PROXY_SECRET."
  fi
else
  say "Creating .env: paste each value and press Enter (secret values stay hidden)"
  # The demo copy (branch "demo") gets its own site, API host and local port.
  if [ "$(git rev-parse --abbrev-ref HEAD 2>/dev/null)" = "demo" ]; then
    SITE=https://umove-demo.rafiarsya.com; API_HOST=umove-demo-api.rafiarsya.com; PORT_LINE="UMOVE_PORT=38472"
  else
    SITE=https://umove.rafiarsya.com; API_HOST=umove-api.rafiarsya.com; PORT_LINE=""
  fi
  ask TUNNEL_TOKEN "Cloudflare Tunnel token (tunnel for $API_HOST)" secret
  # Accept the whole "cloudflared ... --token eyJ..." command too: keep only the token.
  TUNNEL_TOKEN=$(printf '%s' "$TUNNEL_TOKEN" | grep -o 'eyJ[A-Za-z0-9._=+/-]*' | head -n1 || true)
  [ -n "$TUNNEL_TOKEN" ] || fail "That doesn't look like a Tunnel token (it starts with eyJ)."
  ask GOOGLE_CLIENT_ID "Google Client ID (…apps.googleusercontent.com)"
  ask GOOGLE_CLIENT_SECRET "Google Client secret" secret
  ask ADMIN_EMAILS "Admin Google email(s), comma-separated" "" "" "rafiarsya.work@gmail.com"
  ask TELEGRAM_BOT_TOKEN "Telegram bot token (optional, Enter to skip)" secret optional

  case "$GOOGLE_CLIENT_ID" in *.apps.googleusercontent.com) ;; *) fail "That Client ID doesn't end with .apps.googleusercontent.com";; esac

  cat > .env <<ENV
POSTGRES_PASSWORD=$(gen)
APP_DB_PASSWORD=$(gen)
PROXY_SECRET=$(gen)$(gen)
TUNNEL_TOKEN=$TUNNEL_TOKEN
GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
ADMIN_EMAILS=$ADMIN_EMAILS
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN
PUBLIC_ORIGIN=$SITE
RATE_LIMIT_SITE=600
RATE_LIMIT_API=120
$PORT_LINE
ENV
  chmod 600 .env
  echo "  .env written (readable by you only)."
fi

# --- Build and start ------------------------------------------------------
PORT_LOCAL=$(grep -s '^UMOVE_PORT=' .env | cut -d= -f2 || true); PORT_LOCAL=${PORT_LOCAL:-3100}
say "Building and starting UMOVE (the first build takes a few minutes)..."
docker compose up -d --wait db
bash scripts/migrate.sh
docker compose up -d --build

say "Waiting for UMOVE to become healthy..."
for _ in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:$PORT_LOCAL/api/health >/dev/null 2>&1; then
    docker compose ps
    say "UMOVE API is running."
    echo "  Local check:  curl http://127.0.0.1:$PORT_LOCAL/api/health"
    echo "  Logs:         docker compose logs -f app"
    SITE_NOW=$(grep -s '^PUBLIC_ORIGIN=' .env | cut -d= -f2); SITE_NOW=${SITE_NOW:-https://umove.rafiarsya.com}
    case "$SITE_NOW" in *demo*) WORKER=umove-demo ;; *) WORKER=umove ;; esac
    say "Last step: give the web Worker this secret (Cloudflare → Workers → $WORKER → Settings → Variables and Secrets → Add → Secret):"
    echo "  Name:  PROXY_SECRET"
    echo "  Value: $(grep '^PROXY_SECRET=' .env | cut -d= -f2)"
    echo "Then open $SITE_NOW"
    exit 0
  fi
  sleep 3
done
docker compose ps
fail "UMOVE didn't become healthy in 3 minutes. Check: docker compose logs app db"
