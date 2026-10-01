#!/usr/bin/env bash
# Shared helpers for the UMOVE server scripts (sourced, not run).
# Sends Telegram messages and files to the admins who connected Telegram
# in Admin → Overview, using the bot token from .env. Every function is
# best-effort: if Telegram isn't set up, it quietly does nothing.

envval() { grep -s "^$1=" .env | head -n1 | cut -d= -f2- | tr -d '\r'; }

psqlq() { docker compose exec -T db psql -v ON_ERROR_STOP=1 -qtA -U umove -d umove "$@"; }

# Telegram chat ids of the admins (ADMIN_EMAILS) who linked Telegram.
tg_chats() {
  local emails list
  emails=$(envval ADMIN_EMAILS | tr 'A-Z' 'a-z' | tr -d ' ')
  [ -n "$emails" ] || return 0
  # Quote each email for SQL; only [a-z0-9@._+-] survive, so nothing can break out.
  list=$(printf '%s' "$emails" | tr -cd 'a-z0-9@._+,-' | sed "s/[^,][^,]*/'&'/g")
  psqlq -c "select telegram_chat_id from users where telegram_chat_id is not null and status = 'active' and lower(email::text) in ($list)" 2>/dev/null || true
}

tg_send() { # tg_send "message"
  local token chat
  token=$(envval TELEGRAM_BOT_TOKEN)
  [ -n "$token" ] || return 0
  for chat in $(tg_chats); do
    curl -fsS -m 20 -o /dev/null "https://api.telegram.org/bot$token/sendMessage" \
      --data-urlencode "chat_id=$chat" --data-urlencode "text=$1" || true
  done
}

tg_file() { # tg_file path "caption"
  local token chat ok=1
  token=$(envval TELEGRAM_BOT_TOKEN)
  [ -n "$token" ] || return 1
  for chat in $(tg_chats); do
    if curl -fsS -m 120 -o /dev/null "https://api.telegram.org/bot$token/sendDocument" \
      -F "chat_id=$chat" -F "caption=$2" -F "document=@$1"; then ok=0; fi
  done
  return $ok
}
