<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/38aca968-8efc-4d2d-8dc4-664da394d3e7

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## SeparaciÃ³n landing + sistema

Ahora el repo queda dividido asÃ­:

1. `landing/`: sitio pÃºblico estÃ¡tico para subir por FileZilla o hosting tradicional
2. `client/`: frontend del sistema PAS Alert para desplegar junto al backend en tu VPS
3. `server/`: API Node + Prisma consumida por el sistema y por los formularios pÃºblicos

### Variables importantes

- `landing/.env`
  - `VITE_API_URL`: URL pÃºblica de tu API/VPS
  - `VITE_SYSTEM_URL`: URL pÃºblica del sistema, por ejemplo `https://app.tudominio.com`

- `client/.env`
  - `VITE_API_URL`: URL pÃºblica de la API
  - `VITE_LANDING_URL`: opcional, URL pÃºblica de la landing

- `server/.env`
  - `SYSTEM_APP_URL`: URL del frontend del sistema
  - `LANDING_URL`: URL de la landing
  - `CORS_ALLOWED_ORIGINS`: lista separada por comas si querÃ©s habilitar mÃ¡s orÃ­genes

## Deploy en Render (Blueprint)

Este repo incluye `render.yaml` para desplegar:

1. `pas-alert-api` (Node + Prisma, carpeta `server/`)
2. `pas-alert-web` (sitio estático Vite, carpeta `client/`)
3. Base PostgreSQL externa/compartida (no crea DB nueva en Render)

Nota: en Blueprints de Render, si no definís `plan`, los recursos nuevos se crean con planes pagos por defecto. En este repo ya quedó configurado `plan: free` para la API.

### Variables importantes

- API (`pas-alert-api`)
  - `DATABASE_URL`: URL de la base compartida incluyendo `?schema=pas_alert_nico` (o el schema único que elijas)
  - `JWT_SECRET`: se genera automáticamente
  - `MP_ACCESS_TOKEN`: token de Mercado Pago
  - `MP_WEBHOOK_URL`: opcional, para forzar la URL pública del webhook si no querés depender de `RENDER_EXTERNAL_URL`
  - `APP_URL`: toma la URL pública del frontend (`RENDER_EXTERNAL_URL`)
  - Webhook de suscripciones: el backend intenta autocompletar `notification_url` usando `MP_WEBHOOK_URL` o `RENDER_EXTERNAL_URL`, pero igual conviene dejar la URL visible/configurada en Mercado Pago Developers para pruebas y auditoría

- Frontend (`pas-alert-web`)
  - `VITE_API_URL`: toma la URL pública del backend (`RENDER_EXTERNAL_URL`)

### Pasos

1. Hacer push del repo a GitHub.
2. En Render, crear un **Blueprint** desde ese repo.
3. Cargar secretos en `pas-alert-api`:
   - `DATABASE_URL` con tu conexión compartida + schema aislado, por ejemplo:
     `postgresql://.../basefree?schema=pas_alert_nico`
   - `MP_ACCESS_TOKEN`.
4. Ejecutar la migración nueva de Prisma si el entorno no usa el `startCommand` del blueprint:
   - `cd server && npx prisma migrate deploy`
5. Elegir un schema único (`pas_alert_nico`, `pas_alert_prod`, etc.) para no mezclar tablas con otros proyectos.
6. Configurar en Mercado Pago Developers el webhook de suscripciones hacia `https://TU_API_PUBLICA/api/subscriptions/webhook`.
7. Esperar a que termine el deploy de API + frontend.
