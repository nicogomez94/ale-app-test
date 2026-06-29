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

### Etapa B: cuponeras y WhatsApp

Las cuponeras PDF se guardan fuera del repositorio, por defecto en
`/var/lib/pas-alert/cuponeras`, y solo se descargan por endpoints autenticados.
Antes de desplegar, completar en `server/.env` las variables `COUPON_*` y
`WHATSAPP_*` documentadas en `server/.env.example`.

El envío usa una plantilla aprobada de Meta llamada
`aviso_vencimiento_cuponera`, idioma `es_AR`, con encabezado de tipo documento
y cinco parámetros de cuerpo: cliente, número de póliza, aseguradora,
vencimiento y nombre del PAS. El webhook público a registrar en Meta es:

```text
https://pasalert.com/api/whatsapp/webhook
```

Mientras falten número, versión de Graph API o token, el backend responde
`503 whatsapp_not_configured` y no abre WhatsApp Web como alternativa.

### Etapa C: resumen semanal por WhatsApp

El servidor revisa cada minuto si en `America/Argentina/Buenos_Aires` ya son
las 08:00 del lunes. Cada PAS activo y no administrador recibe su propio
resumen de pólizas con vencimiento durante los próximos 7 días. Si no tiene
vencimientos, recibe igualmente el mensaje correspondiente.

La plantilla aprobada `resumen_semanal_vencimientos` (`es_AR`) debe tener este
cuerpo con dos parámetros:

```text
Hola {{1}}, este es tu resumen semanal de PAS Alert:

{{2}}
```

El primer parámetro es el nombre del PAS y el segundo contiene el detalle. Si
el listado supera `WHATSAPP_WEEKLY_CHUNK_MAX_CHARS`, se divide en partes
numeradas sin omitir pólizas. La combinación PAS + semana es única, evitando
duplicados ante reinicios o ejecuciones repetidas. Los estados se auditan en
el Panel de Administración y se actualizan mediante el mismo webhook de Meta.

La carpeta de cuponeras debe incluirse en el backup del VPS junto con
PostgreSQL. Por ejemplo:

```bash
sudo tar -czf /ruta-segura/pas-alert-cuponeras-$(date +%F).tar.gz /var/lib/pas-alert/cuponeras
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
SERVICE_USER=pas-alert \
COUPON_STORAGE_DIR=/var/lib/pas-alert/cuponeras \
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
