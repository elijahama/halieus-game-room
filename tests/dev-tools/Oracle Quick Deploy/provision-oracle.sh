#!/usr/bin/env bash
set -euo pipefail

# ONE-TIME Oracle host provisioning for Halieus Game Room.
# Routine releases MUST use quick-install.sh instead; that script intentionally
# does not run apt/dnf, Certbot, or rewrite nginx.

DOMAIN="${DOMAIN:-halieus.remotewire.net}"
APP_PORT="${APP_PORT:-3000}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run with sudo/root." >&2
  exit 1
fi

if command -v apt-get >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y unzip nginx curl ca-certificates rsync certbot python3-certbot-nginx
elif command -v dnf >/dev/null 2>&1; then
  dnf install -y unzip nginx curl ca-certificates rsync certbot python3-certbot-nginx || dnf install -y unzip nginx curl ca-certificates rsync certbot
else
  echo "Unsupported package manager." >&2
  exit 1
fi

major=0
if command -v node >/dev/null 2>&1; then major="$(node -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || echo 0)"; fi
if [[ "$major" -lt 20 ]] || ! command -v npm >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
  else
    curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
    dnf install -y nodejs
  fi
fi

if ! swapon --show --noheadings 2>/dev/null | grep -q .; then
  mem_kb="$(awk '/MemTotal:/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)"
  if [[ "${mem_kb:-0}" -lt 2097152 && ! -f /swapfile ]]; then
    fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=progress
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
    swapon /swapfile
    grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  elif [[ -f /swapfile ]]; then
    swapon /swapfile || true
  fi
fi

systemctl enable --now nginx

echo "Oracle provisioning complete. Routine Halieus Update can now deploy application releases without reinstalling OS packages."
echo "Domain: $DOMAIN · application port: $APP_PORT"
