#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/linkto}"
APP_PORT="${APP_PORT:-3003}"
DOMAIN="${DOMAIN:-linkto.nxnl.app}"
REPO_URL="${REPO_URL:-https://github.com/KOR-uramy/linkto.git}"
BRANCH="${BRANCH:-main}"

echo "==> Deploy LinkTo API to EC2 (port ${APP_PORT})"

if [ ! -d "$APP_DIR/.git" ]; then
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [ ! -f .env.local ] && [ ! -f secrets/google-oauth-client.json ]; then
  echo "WARNING: Set secrets/google-oauth-client.json or .env.local with Google OAuth keys."
fi

npm ci
node scripts/migrate-json-to-sqlite.mjs || true
BUILD_TARGET= npm run build

pm2 delete linkto 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

sudo cp deploy/nginx/linkto-api.conf "/etc/nginx/sites-available/${DOMAIN}-api"
sudo ln -sf "/etc/nginx/sites-available/${DOMAIN}-api" "/etc/nginx/sites-enabled/${DOMAIN}-api"
sudo rm -f "/etc/nginx/sites-enabled/${DOMAIN}" "/etc/nginx/sites-enabled/linkto.nxnl.app"
sudo nginx -t
sudo systemctl reload nginx

echo "==> API ready: https://${DOMAIN}/api/* (port ${APP_PORT})"
