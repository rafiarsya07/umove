#!/usr/bin/env bash
# UMOVE: one-time setup so the mini PC looks after itself.
#
#   cd ~/umove && bash scripts/setup-automation.sh
#
# Safe to run again. It asks for your sudo password once. It sets up:
#   1. Schedule (crontab): backup every night 03:30, backup test Sunday 04:30,
#      upkeep Sunday 05:00, auto-update every 5 minutes, notice after reboot.
#   2. A backup passphrase in .env (shown ONCE; save it in your password manager).
#   3. Starts on boot: Docker enabled, sleep/suspend disabled.
#   4. Security updates installed automatically; if one needs a restart,
#      the mini PC reboots by itself at 04:15 and UMOVE comes back.
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."
DIR=$(pwd)
say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
[ "$(id -u)" -ne 0 ] || { echo "Run as your normal user, not root."; exit 1; }
[ -f .env ] || { echo "No .env here. Run scripts/install.sh first."; exit 1; }

say "1/4 Backup passphrase"
if grep -q '^BACKUP_PASSPHRASE=.\{20,\}' .env; then
  echo "  Already set (kept)."
else
  sed -i '/^BACKUP_PASSPHRASE=/d' .env
  PASS=$(head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32)
  echo "BACKUP_PASSPHRASE=$PASS" >> .env
  echo "  Backups sent to Telegram are encrypted with this passphrase:"
  echo
  echo "      $PASS"
  echo
  echo "  SAVE IT NOW in your password manager (or write it down somewhere safe)."
  echo "  If the mini PC dies, you need it to open the backups. It is not shown again."
  read -rp "  Saved it? Press Enter to continue. "
fi

say "2/4 Schedule (crontab)"
TMP=$(mktemp)
crontab -l 2>/dev/null | grep -v '# umove-auto' | grep -v 'scripts/auto-update.sh' | grep -v 'scripts/backup.sh' > "$TMP" || true
cat >> "$TMP" <<CRON
*/5 * * * * cd $DIR && bash scripts/auto-update.sh >> backups/auto-update.log 2>&1 # umove-auto
30 3 * * * cd $DIR && bash scripts/backup.sh >> backups/backup.log 2>&1 # umove-auto
30 4 * * 0 cd $DIR && bash scripts/backup-check.sh >> backups/backup.log 2>&1 # umove-auto
0 5 * * 0 cd $DIR && bash scripts/maintenance.sh >> backups/maintenance.log 2>&1 # umove-auto
@reboot cd $DIR && bash scripts/on-boot.sh >> backups/boot.log 2>&1 # umove-auto
CRON
crontab "$TMP"; rm -f "$TMP"
mkdir -p backups
crontab -l | grep umove-auto

say "3/4 Start on boot, never sleep (sudo password)"
sudo systemctl enable --now docker >/dev/null
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target >/dev/null 2>&1 || true
# Keep the system log from growing without limit.
sudo mkdir -p /etc/systemd/journald.conf.d
printf '[Journal]\nSystemMaxUse=200M\n' | sudo tee /etc/systemd/journald.conf.d/umove.conf >/dev/null
sudo systemctl restart systemd-journald || true
# Let maintenance.sh trim the journal without a password.
echo "$USER ALL=(root) NOPASSWD: /usr/bin/journalctl --vacuum-size=200M" | sudo tee /etc/sudoers.d/umove-journal >/dev/null
sudo chmod 440 /etc/sudoers.d/umove-journal
echo "  Docker starts on boot; sleep and suspend are off."

say "4/4 Automatic security updates + reboot when needed (04:15)"
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq unattended-upgrades >/dev/null
sudo tee /etc/apt/apt.conf.d/20auto-upgrades >/dev/null <<'APT'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
APT
sudo tee /etc/apt/apt.conf.d/52umove-unattended >/dev/null <<'APT'
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:15";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
APT
echo "  Security updates install every day; a reboot (if needed) happens at 04:15."

say "Done. Test the backup now (sends the first encrypted copy to your Telegram):"
echo "  bash scripts/backup.sh && bash scripts/backup-check.sh"
echo
echo "One thing only you can do: in the mini PC's BIOS, set"
echo "  'Restore on AC Power Loss' (or 'After Power Failure') = Power On"
echo "so it turns itself back on after a power cut. See docs/SETUP.md."
