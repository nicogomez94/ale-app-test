set -Eeuo pipefail

APP_DIR="/var/www/html/ale-app-test"
CLIENT_DIR="$APP_DIR/client"
SERVER_DIR="$APP_DIR/server"
PM2_APP="${PM2_APP:-pas-alert-api}"
VITE_API_URL="${VITE_API_URL:-https://pasalert.com}"
LOG_DIR="${LOG_DIR:-$APP_DIR/logs}"
LOCK_FILE="${LOCK_FILE:-/tmp/pas-alert-redeploy.lock}"

mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/redeploy-$(date '+%Y%m%d-%H%M%S').log"
exec > >(tee -a "$LOG_FILE") 2>&1

log() {
  printf '[%s] %s\n' "$(date '+%F %T')" "$*"
}

die() {
  log "ERROR: $*"
  exit 1
}

run() {
  local label="$1"
  shift
  log "==> $label"
  "$@"
  log "OK: $label"
}

reload_nginx_if_available() {
  if ! command -v nginx >/dev/null 2>&1; then
    log "Nginx no esta instalado; salto reload."
    return 0
  fi

  run "Validar config Nginx" nginx -t

  if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files nginx.service >/dev/null 2>&1; then
    run "Recargar Nginx" systemctl reload nginx
    return 0
  fi

  if command -v service >/dev/null 2>&1; then
    run "Recargar Nginx" service nginx reload
    return 0
  fi

  run "Recargar Nginx" nginx -s reload
}

has_npm_script() {
  local script_name="$1"
  node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts[process.argv[1]] ? 0 : 1)" "$script_name"
}

on_error() {
  local exit_code="$?"
  log "FALLO en linea $1. Ultimo comando: $2"
  log "Log completo: $LOG_FILE"
  exit "$exit_code"
}

trap 'on_error "$LINENO" "$BASH_COMMAND"' ERR

exec 9>"$LOCK_FILE"
flock -n 9 || die "Ya hay un redeploy corriendo. Lock: $LOCK_FILE"

log "Inicio redeploy"
log "Proyecto: $APP_DIR"
log "Frontend API URL: $VITE_API_URL"
log "PM2 app: $PM2_APP"
log "Log: $LOG_FILE"

for command_name in git npm npx node pm2 flock tee grep; do
  command -v "$command_name" >/dev/null 2>&1 || die "Falta el comando requerido: $command_name"
done

[ -d "$APP_DIR/.git" ] || die "No encontre repo git en $APP_DIR"
[ -d "$CLIENT_DIR" ] || die "No encontre client en $CLIENT_DIR"
[ -d "$SERVER_DIR" ] || die "No encontre server en $SERVER_DIR"
[ -f "$CLIENT_DIR/package.json" ] || die "No encontre $CLIENT_DIR/package.json"
[ -f "$SERVER_DIR/package.json" ] || die "No encontre $SERVER_DIR/package.json"

cd "$APP_DIR"

dirty_status="$(git status --porcelain | grep -vE '^\?\? (redeploy\.sh|logs(/|$))' || true)"
if [ -n "$dirty_status" ]; then
  log "Working tree con cambios locales:"
  printf '%s\n' "$dirty_status"
  die "No hago pull con cambios locales sin revisar."
fi

run "Actualizar codigo" git pull --ff-only

cd "$CLIENT_DIR"

if [ -f package-lock.json ]; then
  run "Instalar dependencias del client" npm ci
else
  run "Instalar dependencias del client" npm install
fi

if has_npm_script "lint"; then
  run "Typecheck client" npm run lint
else
  log "Sin script lint en client; salto typecheck."
fi

run "Compilar client" env VITE_API_URL="$VITE_API_URL" npm run build

cd "$SERVER_DIR"

if [ -f package-lock.json ]; then
  run "Instalar dependencias del server" npm ci
else
  run "Instalar dependencias del server" npm install
fi

if has_npm_script "db:generate"; then
  run "Generar Prisma Client" npm run db:generate
else
  run "Generar Prisma Client" npx prisma generate
fi

if [ -d prisma/migrations ]; then
  run "Aplicar migraciones Prisma" npx prisma migrate deploy
else
  log "Sin carpeta prisma/migrations; salto migraciones."
fi

log "Seed deshabilitado en produccion; no se ejecuta durante redeploy."

run "Compilar server" npm run build

if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
  run "Reiniciar PM2 $PM2_APP" pm2 restart "$PM2_APP" --update-env
else
  run "Crear PM2 $PM2_APP" pm2 start dist/index.js --name "$PM2_APP" --update-env
fi

run "Guardar estado PM2" pm2 save

reload_nginx_if_available

log "Redeploy terminado correctamente"