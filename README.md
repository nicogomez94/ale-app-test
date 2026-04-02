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

## Deploy en Render (Blueprint)

Este repo incluye `render.yaml` para desplegar:

1. `pas-alert-api` (Node + Prisma, carpeta `server/`)
2. `pas-alert-web` (sitio estático Vite, carpeta `client/`)
3. `pas-alert-db` (PostgreSQL en Render)

### Variables importantes

- API (`pas-alert-api`)
  - `DATABASE_URL`: se conecta automáticamente al Postgres del Blueprint
  - `JWT_SECRET`: se genera automáticamente
  - `MP_ACCESS_TOKEN`: se carga como secreto (`sync: false`)
  - `APP_URL`: toma la URL pública del frontend (`RENDER_EXTERNAL_URL`)

- Frontend (`pas-alert-web`)
  - `VITE_API_URL`: toma la URL pública del backend (`RENDER_EXTERNAL_URL`)

### Pasos

1. Hacer push del repo a GitHub.
2. En Render, crear un **Blueprint** desde ese repo.
3. Completar el secreto `MP_ACCESS_TOKEN` cuando Render lo solicite.
4. Esperar a que termine el primer deploy de los 3 recursos.
