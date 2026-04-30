# Testing — Jobs periódicos y emails (Render)

API: `https://pas-alert-api.onrender.com`  
Base de datos: `nuevabase_czjq` — schema `pas_alert_nico`

## Usuarios en DB

| email | id | rol |
|---|---|---|
| `nicolas@gmail.com` | `5735f029-7a63-4d3f-813e-b0d9110480bd` | **admin** |
| `pepe@gmail.com` | `a28ad896-5666-41c2-966f-50bcb0e8432b` | usuario de prueba |

---

## Paso previo — Deploy

Los endpoints `/run-jobs` y `/test-seed` son nuevos. Antes de testear, hacer el deploy desde Render:

**Render → pas-alert-api → Manual Deploy → Deploy latest commit**

> En el free tier el server se duerme tras 15 min de inactividad. La primera request puede tardar ~30s en responder (cold start). Es normal.

---

## Prerequisitos

Conseguir el token admin (una sola vez):
```bash
curl -s -X POST https://pas-alert-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nicolas@gmail.com","password":"TU_PASSWORD"}' | grep -o '"token":"[^"]*"'
```

Guardar el token en una variable de terminal:
```bash
TOKEN="eyJhbGci..."
```

---

## Test 1 — Estados de pólizas (ACTIVA / VENCE_PRONTO / VENCIDA)

```bash
# Paso 1: mover pólizas de pepe para que venzan en 3 días
curl -X POST https://pas-alert-api.onrender.com/api/admin/test-seed \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"a28ad896-5666-41c2-966f-50bcb0e8432b","scenario":"policy_vence_pronto"}'

# Paso 2: correr el job
curl -X POST https://pas-alert-api.onrender.com/api/admin/run-jobs \
  -H "Authorization: Bearer $TOKEN"
```

**Resultado esperado:** respuesta `{ "results": { "policies": "ok" } }` y las pólizas de pepe muestran `VENCE_PRONTO` en el dashboard.

Variante — pólizas ya vencidas:
```bash
curl -X POST https://pas-alert-api.onrender.com/api/admin/test-seed \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"a28ad896-5666-41c2-966f-50bcb0e8432b","scenario":"policy_vencida"}'
```

---

## Test 2 — Email de recordatorio de suscripción

```bash
# Paso 1: setear trialFin de pepe a 1 día
curl -X POST https://pas-alert-api.onrender.com/api/admin/test-seed \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"a28ad896-5666-41c2-966f-50bcb0e8432b","scenario":"expiring_1d"}'

# Paso 2: correr el job — debe llegar email a pepe@gmail.com
curl -X POST https://pas-alert-api.onrender.com/api/admin/run-jobs \
  -H "Authorization: Bearer $TOKEN"
```

**Resultado esperado:** `{ "results": { "reminders": "ok" } }` y email recibido en la casilla de pepe.

Variante — 3 días:
```bash
-d '{"userId":"a28ad896-5666-41c2-966f-50bcb0e8432b","scenario":"expiring_3d"}'
```

---

## Test 3 — Suscripción vencida → acceso bloqueado

```bash
# Paso 1: expirar la suscripción de pepe
curl -X POST https://pas-alert-api.onrender.com/api/admin/test-seed \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"a28ad896-5666-41c2-966f-50bcb0e8432b","scenario":"expired"}'

# Paso 2: loguearse como pepe e intentar acceder al dashboard
# debe responder 403 { "error": "subscription_expired" }
```

---

## Test 4 — Reset mensual de referidos

> Ideal correrlo el **1° de mayo** (mañana).

```bash
# Paso 1: poner referidosMes = 5 en pepe
curl -X POST https://pas-alert-api.onrender.com/api/admin/test-seed \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"a28ad896-5666-41c2-966f-50bcb0e8432b","scenario":"day1_referrals"}'

# Paso 2: el 1° del mes, correr el job
curl -X POST https://pas-alert-api.onrender.com/api/admin/run-jobs \
  -H "Authorization: Bearer $TOKEN"
```

**Resultado esperado:** `{ "results": { "referrals": "ok" } }` y `referidosMes` vuelve a `0`.  
Verificar en la sección Referidos del panel de pepe.

---

## Test 5 — Recuperación de contraseña

```bash
curl -X POST https://pas-alert-api.onrender.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"pepe@gmail.com"}'
```

**Resultado esperado:** email a `pepe@gmail.com` con código de 6 dígitos.

Verificar expiración — esperar 15 min y usar el código:
```bash
curl -X POST https://pas-alert-api.onrender.com/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email":"pepe@gmail.com","code":"123456","newPassword":"nueva1234"}'
# Debe responder: "El código ha expirado. Solicita uno nuevo."
```

---

## Escenarios disponibles (test-seed)

| scenario | qué hace |
|---|---|
| `expiring_1d` | `planVencimiento` y `trialFin` → ahora + 23h59m |
| `expiring_3d` | `planVencimiento` y `trialFin` → ahora + 2d23h59m |
| `expired` | `planVencimiento` y `trialFin` → hace 1 minuto |
| `policy_vence_pronto` | todas las pólizas del usuario vencen en 3 días |
| `policy_vencida` | todas las pólizas del usuario se mueven 400 días al pasado |
| `day1_referrals` | `referidosMes` = 5 (para testear el reset del día 1) |
