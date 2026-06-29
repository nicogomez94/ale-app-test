#!/usr/bin/env bash
set -euo pipefail

APP_URL="${APP_URL:-https://pasalert.com}"
API_URL="${API_URL:-https://pasalert.com}"
BRANCH="${BRANCH:-colores}"
SERVICE_NAME="${SERVICE_NAME:-pas-alert-api}"
SERVICE_USER="${SERVICE_USER:-$(id -un)}"
COUPON_STORAGE_DIR="${COUPON_STORAGE_DIR:-/var/lib/pas-alert/cuponeras}"
RUN_GIT_PULL="${RUN_GIT_PULL:-1}"
RESTART_SERVICE="${RESTART_SERVICE:-1}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

if [[ ! -d .git ]]; then
  echo "Este script debe ejecutarse dentro del repo git de PAS Alert." >&2
  exit 1
fi

if [[ ! -f server/.env ]]; then
  echo "Falta server/.env. Crealo antes de desplegar para no perder secretos." >&2
  exit 1
fi

echo "Deploy PAS Alert"
echo "Repo: $ROOT_DIR"
echo "Branch: $BRANCH"
echo "Frontend API URL: $API_URL"

if [[ "$RUN_GIT_PULL" == "1" ]]; then
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
fi

npm --prefix client ci
VITE_API_URL="$API_URL" npm --prefix client run build

npm --prefix server ci
npm --prefix server run db:generate
(cd server && npx prisma migrate deploy)
npm --prefix server run build

sudo install -d -m 0750 -o "$SERVICE_USER" -g "$SERVICE_USER" "$COUPON_STORAGE_DIR"

if [[ "$RESTART_SERVICE" == "1" ]]; then
  sudo systemctl restart "$SERVICE_NAME"
  sudo systemctl --no-pager --lines=20 status "$SERVICE_NAME"
fi

echo "Build frontend: $ROOT_DIR/client/dist"
echo "Cuponeras privadas: $COUPON_STORAGE_DIR (usuario: $SERVICE_USER)"
echo "Smoke test sugerido: curl -I $APP_URL && curl -fsS $API_URL/api/health"
