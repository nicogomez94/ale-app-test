# PAS Alert

Sistema PAS Alert dividido en dos partes:

1. `client/`: frontend del sistema, compilado con Vite en `client/dist`.
2. `server/`: API Node/Express con Prisma, compilada en `server/dist`.

## Desarrollo Local

Instalar dependencias:

```bash
npm --prefix client install
npm --prefix server install
```

Configurar variables:

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

Levantar API y frontend en terminales separadas:

```bash
npm --prefix server run dev
npm --prefix client run dev
```

## Variables

`client/.env`:

```bash
VITE_API_URL=http://localhost:3001
```

`server/.env`:

```bash
DATABASE_URL=postgresql://user:password@host:5432/db?schema=pas_alert_prod
JWT_SECRET=...
APP_URL=https://pasalert.com
SYSTEM_APP_URL=https://pasalert.com
CORS_ALLOWED_ORIGINS=https://pasalert.com
PORT=3001
```

## Build

Desde la raiz:

```bash
npm run build
```

Ese comando compila:

1. Frontend del sistema en `client/dist`.
2. Backend en `server/dist`.

## Deploy en VPS

En produccion, nginx debe servir `client/dist` y la API debe arrancar desde `server/dist/index.js`.

Desde la carpeta del repo en el VPS:

```bash
BRANCH=colores \
APP_URL=https://pasalert.com \
API_URL=https://pasalert.com \
SERVICE_NAME=pas-alert-api \
./scripts/deploy-vps.sh
```

Si el servicio systemd tiene otro nombre, cambiar `SERVICE_NAME`.

El script hace:

1. `git pull` de la rama indicada.
2. `npm ci` y build del frontend en `client/dist`.
3. `npm ci`, `prisma generate`, `prisma migrate deploy` y build del backend en `server/dist`.
4. Reinicio del servicio systemd.

## Checks

Verificar que nginx este sirviendo el build nuevo:

```bash
curl -fsSL https://pasalert.com | grep '/assets/index-'
```

Verificar API:

```bash
curl -fsS https://pasalert.com/api/health
```

Ver logs de la API:

```bash
sudo journalctl -u pas-alert-api -n 80 --no-pager
```

Si aparecen errores 500 en rutas como `/api/dashboard/policies` o `/api/commissions/summary`, normalmente falta correr migraciones:

```bash
cd server
npx prisma migrate deploy
sudo systemctl restart pas-alert-api
```
