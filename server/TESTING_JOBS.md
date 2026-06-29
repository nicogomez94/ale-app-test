# Testing - Jobs periodicos y emails (VPS)

API: `https://pasalert.com`  
Base de datos: `nuevabase_czjq` — schema `pas_alert_nico`

## Usuarios en DB

| email | id | rol |
|---|---|---|
| `nicolas@gmail.com` | `5735f029-7a63-4d3f-813e-b0d9110480bd` | **admin** |
| `pepe@gmail.com` | `a28ad896-5666-41c2-966f-50bcb0e8432b` | usuario de prueba |

---

## Paso previo — Deploy

Los endpoints `/run-jobs` y `/test-seed` son nuevos. Antes de testear, hacer el deploy desde el VPS:

`BRANCH=colores APP_URL=https://pasalert.com API_URL=https://pasalert.com SERVICE_NAME=pas-alert-api ./scripts/deploy-vps.sh`

---

## Prerequisitos

Conseguir el token admin (una sola vez):
```bash
curl -s -X POST https://pasalert.com/api/auth/login \
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
curl -X POST https://pasalert.com/api/admin/test-seed \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"a28ad896-5666-41c2-966f-50bcb0e8432b","scenario":"policy_vence_pronto"}'

# Paso 2: correr el job
curl -X POST https://pasalert.com/api/admin/run-jobs \
  -H "Authorization: Bearer $TOKEN"
```

**Resultado esperado:** respuesta `{ "results": { "policies": "ok" } }` y las pólizas de pepe muestran `VENCE_PRONTO` en el dashboard. La ejecución manual también intenta el resumen semanal para usuarios de prueba y devuelve `weeklySummaries`.

Variante — pólizas ya vencidas:
```bash
curl -X POST https://pasalert.com/api/admin/test-seed \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"a28ad896-5666-41c2-966f-50bcb0e8432b","scenario":"policy_vencida"}'
```

El escenario las deja vencidas hace 30 días, por lo que todavía deben permanecer visibles.

Variante — limpieza automática a 60 días:
```bash
curl -X POST https://pasalert.com/api/admin/test-seed \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"a28ad896-5666-41c2-966f-50bcb0e8432b","scenario":"policy_cleanup"}'

curl -X POST https://pasalert.com/api/admin/run-jobs \
  -H "Authorization: Bearer $TOKEN"
```

**Resultado esperado:** `policyCleanup: "ok"` y las pólizas, cuotas y cuponeras del usuario de prueba quedan eliminadas.

---

## Test 2 — Email de recordatorio de suscripción

```bash
# Paso 1: setear trialFin de pepe a 1 día
curl -X POST https://pasalert.com/api/admin/test-seed \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"a28ad896-5666-41c2-966f-50bcb0e8432b","scenario":"expiring_1d"}'

# Paso 2: correr el job — debe llegar email a pepe@gmail.com
curl -X POST https://pasalert.com/api/admin/run-jobs \
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
curl -X POST https://pasalert.com/api/admin/test-seed \
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
curl -X POST https://pasalert.com/api/admin/test-seed \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"a28ad896-5666-41c2-966f-50bcb0e8432b","scenario":"day1_referrals"}'

# Paso 2: el 1° del mes, correr el job
curl -X POST https://pasalert.com/api/admin/run-jobs \
  -H "Authorization: Bearer $TOKEN"
```

**Resultado esperado:** `{ "results": { "referrals": "ok" } }` y `referidosMes` vuelve a `0`.  
Verificar en la sección Referidos del panel de pepe.

---

## Test 5 — Recuperación de contraseña

```bash
curl -X POST https://pasalert.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"pepe@gmail.com"}'
```

**Resultado esperado:** email a `pepe@gmail.com` con código de 6 dígitos.

Verificar expiración — esperar 15 min y usar el código:
```bash
curl -X POST https://pasalert.com/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email":"pepe@gmail.com","code":"123456","newPassword":"nueva1234"}'
# Debe responder: "El código ha expirado. Solicita uno nuevo."
```

---

## Test 6 — Resumen semanal WhatsApp

1. Marcá al usuario como usuario de prueba y cargale un teléfono argentino válido.
2. Aplicá `policy_vence_pronto`.
3. Ejecutá `/api/admin/run-jobs`; la ejecución manual fuerza la Etapa C aunque no sea lunes.
4. Con un primer envío aceptado, volvé a ejecutarla: debe informar el despacho como duplicado y no enviar nuevamente. Los despachos fallidos sí se reintentan.
5. Revisá “Auditoría de resúmenes semanales” en el panel administrador.

Con Meta sin configurar, el despacho queda `FAILED` con `whatsapp_not_configured`, sin simular éxito. Con Meta configurado y la plantilla aprobada debe quedar `ACCEPTED` y luego avanzar por webhook a `SENT`, `DELIVERED` o `READ`.

---

## Escenarios disponibles (test-seed)

| scenario | qué hace |
|---|---|
| `expiring_1d` | `planVencimiento` y `trialFin` → ahora + 23h59m |
| `expiring_3d` | `planVencimiento` y `trialFin` → ahora + 2d23h59m |
| `expired` | `planVencimiento` y `trialFin` → hace 1 minuto |
| `policy_vence_pronto` | todas las pólizas del usuario vencen en 3 días |
| `policy_vencida` | todas las pólizas del usuario vencen hace 30 días y permanecen visibles |
| `policy_cleanup` | todas las pólizas del usuario vencen hace 90 días para probar la eliminación automática |
| `day1_referrals` | `referidosMes` = 5 (para testear el reset del día 1) |
