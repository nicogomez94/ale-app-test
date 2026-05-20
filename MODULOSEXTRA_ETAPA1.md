# Módulos Extra — Etapa 1

## Resumen

Implementación completa de los tres módulos de la Etapa 1 según `PAS_Alert_MODULOSXTRA.docx.pdf`.

---

## 1. Módulo de Siniestros

### Base de datos (`server/prisma/schema.prisma`)
- Nuevo modelo `Siniestro` con campos: número, póliza, aseguradora, tipo de seguro, datos del cliente, fecha del siniestro, descripción, estado, prioridad, importe reclamado, importe pagado, observaciones, fecha de resolución.
- Nuevo modelo `SiniestroNota` (relación 1:N con `Siniestro`) para historial de notas.
- Nuevos enums: `SiniestroEstado` (`DENUNCIADO`, `EN_GESTION`, `EN_INSPECCION`, `EN_ANALISIS`, `APROBADO`, `RECHAZADO`, `PAGADO`), `SiniestroProioridad` (`ALTA`, `MEDIA`, `BAJA`).

### Backend (`server/src/routes/siniestros.ts`)
- `GET /api/siniestros` — lista con filtros por estado, prioridad y búsqueda de texto.
- `GET /api/siniestros/kpis` — totales, activos, monto reclamado, monto pagado.
- `GET /api/siniestros/export` — descarga Excel (xlsx).
- `POST /api/siniestros` — crear siniestro.
- `PUT /api/siniestros/:id` — editar.
- `DELETE /api/siniestros/:id` — eliminar.
- `POST /api/siniestros/:id/notas` — agregar nota al historial.
- **Prioridad automática**: Alta si importe > $500.000 o sin actualizar hace +10 días; Media si > $100.000 o +5 días; Baja en el resto.

### Frontend (`client/src/pages/SiniestrosPage.tsx`)
- 4 KPI cards (total, activos, monto reclamado, monto pagado).
- Tabla con chips de estado y prioridad con colores.
- Filtros por texto, estado y prioridad.
- Dialog de creación/edición con campos dinámicos (Automotor muestra patente/marca/modelo; Hogar muestra tipo de daño).
- Drawer lateral de detalle con barra de progreso, historial de notas y botón para agregar nota.
- Exportación a Excel.

### Navegación
- Ítem "Siniestros" agregado al menú lateral con ícono rojo (`ClipboardList`).
- Ruta `/siniestros` registrada en `App.tsx`.

---

## 2. Módulo de Cotizaciones + Página Pública

### Base de datos (`server/prisma/schema.prisma`)
- Nuevo modelo `Cotizacion` con campos: tipo, origen, datos del cliente (nombre, apellido, DNI, email, celular, localidad, provincia), datos del riesgo específicos por tipo (Auto/Moto: patente, marca, modelo, año, GNC, GPS; Hogar: tipo de vivienda, superficie cubierta; Otros: descripción).
- Nuevos enums: `CotizacionTipo` (`AUTO`, `MOTO`, `HOGAR`, `OTROS`), `CotizacionOrigen` (`MANUAL`, `LINK_PUBLICO`).

### Backend (`server/src/routes/cotizaciones.ts`)
- `POST /api/cotizaciones/public/:userId` — **sin autenticación**, recibe el formulario público. Valida que el usuario exista y esté activo.
- `GET /api/cotizaciones` — lista con filtros (requiere auth).
- `GET /api/cotizaciones/export` — Excel.
- `POST /api/cotizaciones` — crear manual.
- `PUT /api/cotizaciones/:id` — editar.
- `DELETE /api/cotizaciones/:id` — eliminar.

### Frontend
**`CotizacionesPage.tsx`** — Página interna:
- Tabla con chips de tipo y origen (Manual / Link público).
- Dialog de creación/edición con selector de tipo y campos dinámicos.
- Dialog de "Compartir Link" con:
  - Selector de tipo pre-seleccionado.
  - URL copiable al portapapeles.
  - **QR Code** generado vía `api.qrserver.com` (sin paquetes extra), que se actualiza al cambiar el tipo.
- Exportación a Excel.

**`CotizacionPublicaPage.tsx`** — Página pública sin login:
- Accesible en `/cotizar/:userId/:tipo?`.
- Formulario con los mismos campos dinámicos por tipo.
- Al enviar hace `POST /api/cotizaciones/public/:userId`.
- Pantalla de éxito: "¡Solicitud Enviada! Un productor de seguros se pondrá en contacto contigo a la brevedad."

### Navegación
- Ítem "Cotizaciones" agregado al menú con ícono celeste (`MessageSquare`).
- Ruta `/cotizaciones` (protegida) y `/cotizar/:userId/:tipo?` (pública, sin layout) registradas en `App.tsx`.

---

## 3. Login con Google

### Backend (`server/src/routes/auth.ts`)
- Nuevo endpoint `POST /auth/google`.
- Recibe `{ idToken, nombre, email, photoURL }`.
- Verifica el token con `https://oauth2.googleapis.com/tokeninfo?id_token=...`.
- Valida la audiencia contra `process.env.GOOGLE_CLIENT_ID`.
- Busca el usuario por email; si no existe lo crea con contraseña aleatoria y 10 días de trial.
- Devuelve JWT idéntico al flujo email/password.

### Frontend
- `client/index.html`: carga el script de Google Identity Services (GIS).
- `AuthContext.tsx`: nuevo método `loginWithGoogle(idToken, nombre, email, photoURL?)`.
- `LoginPage.tsx`: botón "Continuar con Google" que llama a `window.google.accounts.id.prompt()`, decodifica el JWT y llama al backend.

### Configuración necesaria
| Archivo | Variable | Valor |
|---|---|---|
| `client/.env` | `VITE_GOOGLE_CLIENT_ID` | `xxxxxxx.apps.googleusercontent.com` |
| `server/.env` | `GOOGLE_CLIENT_ID` | el mismo Client ID |

Obtener en [console.cloud.google.com](https://console.cloud.google.com) → Credenciales → Crear OAuth 2.0 → Tipo Web.

---

## 4. Multi-moneda (ARS / USD / EUR / BRL)

### Base de datos
- Nuevo enum `CurrencyType` (`ARS`, `USD`, `EUR`, `BRL`).
- Campo `moneda CurrencyType @default(ARS)` en el modelo `Policy`.

### Backend
- `policies.ts`: acepta y persiste el campo `moneda`.
- `dashboard.ts`: retorna `moneda` en el mapeo de pólizas.

### Frontend
- `PolicyForm.tsx`: selector de moneda (ARS/USD/EUR/BRL) en el card de Resumen Económico.
- `DashboardPage.tsx`:
  - Selector de moneda en el dialog de edición de póliza.
  - Badge naranja visible en la columna "Cuota" cuando la moneda es distinta de ARS.
- `api/index.ts`: campo `moneda` en `DashboardPolicy` y `PolicyPayload`.

---

## 5. Caución como ramo financiero

Ya estaba configurada en `client/src/data/policyCatalogs.ts` bajo la categoría **"Seguros financieros"** junto con: Crédito, Garantías contractuales, Seguro de crédito. No se requirieron cambios adicionales.

---

## Migración

```bash
cd server
npx prisma migrate dev --name etapa1_siniestros_cotizaciones_moneda
```

Archivo generado: `server/prisma/migrations/20260520171837_etapa1_siniestros_cotizaciones_moneda/migration.sql`

---

## Archivos modificados / creados

| Archivo | Estado |
|---|---|
| `server/prisma/schema.prisma` | Modificado |
| `server/prisma/migrations/20260520171837_*/migration.sql` | Creado |
| `server/src/routes/siniestros.ts` | Creado |
| `server/src/routes/cotizaciones.ts` | Creado |
| `server/src/routes/auth.ts` | Modificado |
| `server/src/routes/dashboard.ts` | Modificado |
| `server/src/routes/policies.ts` | Modificado |
| `server/src/index.ts` | Modificado |
| `server/.env` | Creado |
| `server/.env.example` | Modificado |
| `client/index.html` | Modificado |
| `client/src/api/index.ts` | Modificado |
| `client/src/App.tsx` | Modificado |
| `client/src/components/Layout.tsx` | Modificado |
| `client/src/context/AuthContext.tsx` | Modificado |
| `client/src/pages/SiniestrosPage.tsx` | Creado |
| `client/src/pages/CotizacionesPage.tsx` | Creado |
| `client/src/pages/CotizacionPublicaPage.tsx` | Creado |
| `client/src/pages/PolicyForm.tsx` | Modificado |
| `client/src/pages/LoginPage.tsx` | Modificado |
| `client/src/pages/DashboardPage.tsx` | Modificado |
| `client/src/vite-env.d.ts` | Modificado |
| `client/.env.example` | Modificado |
