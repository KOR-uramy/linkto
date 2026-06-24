#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/linkto}"
APP_URL="${APP_URL:-https://linkto.fairyquest.click}"
APP_PORT="${APP_PORT:-3003}"
DOMAIN="${DOMAIN:-linkto.fairyquest.click}"
REPO_URL="${REPO_URL:-https://github.com/KOR-uramy/linkto.git}"
BRANCH="${BRANCH:-main}"

echo "==> Deploy LinkTo to ${APP_URL}"

if [ ! -d "$APP_DIR/.git" ]; then
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [ ! -f .env.local ]; then
  echo "WARNING: .env.local not found. Copy from .env.example and set Google OAuth keys."
fi

export NEXT_PUBLIC_APP_URL="$APP_URL"
npm ci
npm run build

pm2 delete linkto 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

sudo cp deploy/nginx/linkto.fairyquest.click.conf "/etc/nginx/sites-available/${DOMAIN}"
sudo ln -sf "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
sudo nginx -t
sudo systemctl reload nginx

if [ ! -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
  sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m imuramy@gmail.com --redirect
fi

echo "==> Done: ${APP_URL} (port ${APP_PORT})"
