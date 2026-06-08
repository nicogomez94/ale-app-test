# Etapa 2 PAS Alert: Administración Financiera y Automatización

## Summary
Implementar la etapa 2 del documento `PAS_Alert_MODULOSXTRA`: nueva sección de Directorio de Aseguradoras/Brokers, facturación detallada de comisiones, y generación/renovación automática de cuotas. Se conserva `Empresas` como módulo de clientes empresa y se amplía `Comisiones` sin eliminar el análisis/cierre mensual actual.

## Key Changes
- Agregar migración Prisma con `InsuranceCompany`, `Broker`, vínculo broker-aseguradora, `CommissionInvoice`, `CommissionInvoicePayment`, vínculo factura-póliza y enum `CommissionInvoiceStatus`.
- Crear cifrado AES-256-GCM en servidor para contraseñas de portales con `PORTAL_CREDENTIAL_SECRET`; los listados devuelven solo `hasPortalPassword`, y el password se descifra solo en endpoint explícito de revelar.
- Nueva sección frontend `/directorio` con tabs `Aseguradoras` y `Brokers`: CRUD, búsqueda, colores de broker, vínculos con aseguradoras, filas expandibles, credenciales ocultas y KPIs por aseguradora.
- Agregar endpoints `/api/directory/insurers` y `/api/directory/brokers`, más export si sigue el patrón de otros módulos.
- Extender `CommissionsPage` con facturación detallada: facturas por aseguradora, período `YYYY-MM`, número, emisión, vencimiento, estado, monto, moneda ARS/USD, pólizas vinculadas, pagos parciales, saldo y diferencia detectada contra comisiones de pólizas.
- Extender `/api/commissions` con `/invoices`, `/invoices/:id/payments`, link/unlink de pólizas y export de facturas.
- Cambiar creación de pólizas para generar cuotas en lote: `MENSUAL=1`, `BIMESTRAL=2`, `TRIMESTRAL=3`, `SEMESTRAL=6`, `ANUAL=12`; cada fila representa una cuota mensual dentro de la vigencia total y la `prima` ingresada es prima por cuota.
- Al marcar pagada la última cuota de un grupo, crear una renovación idempotente con nuevo `groupId`, mismas condiciones, fechas del siguiente período, cuotas nuevas sin pagar y respuesta con `renewalCreated`.

## Public Interfaces
- `PolicyPayload` mantiene campos actuales; `POST /api/policies` devuelve la primera póliza creada más `generatedCount` y `generatedPolicies`.
- `PATCH /api/policies/:id/payment` devuelve `{ policy, renewalCreated, renewalPolicies }`.
- Agregar cliente API `api.directory.insurers/brokers` y `api.commissions.invoices`.
- Actualizar `.env.example` del server con `PORTAL_CREDENTIAL_SECRET`; si falta, se bloquea guardar contraseñas de portal con error claro.

## Test Plan
- Ejecutar `npm run build` desde raíz para validar server y client.
- Verificar Directorio: crear/editar/borrar aseguradora y broker, vincularlos, buscar, expandir fila, y confirmar que la contraseña no aparece en respuestas de listado.
- Verificar facturación: crear factura, vincular pólizas, registrar pagos parciales, validar saldo, cambio de estado y `diferenciaDetectada`.
- Verificar cuotas: crear pólizas mensual/bimestral/trimestral/semestral/anual y confirmar cantidad, fechas, `groupId`, `cuotaActual/cuotaTotal` y prima por cuota.
- Verificar renovación: pagar cuota no final no renueva; pagar cuota final renueva una sola vez aunque se repita la acción; dashboard muestra feedback.

## Assumptions
- No se hace backfill automático de pólizas existentes; la generación en lote aplica a pólizas nuevas.
- No hay conversión automática de monedas; las facturas conservan ARS/USD nativo.
- `Empresas` sigue siendo para clientes empresa; el nuevo directorio vive separado.
- El selector de aseguradora en pólizas puede usar las aseguradoras del directorio y mantener el catálogo estático como respaldo.
