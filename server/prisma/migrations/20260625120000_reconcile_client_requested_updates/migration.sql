-- Reconcile client-requested columns without rewriting historical migrations.
-- Safe for:
-- - databases where 20260612120000 was resolved as already applied,
-- - databases where 20260612120000 actually ran,
-- - clean databases applying the full migration chain.

ALTER TABLE "LifePolicy" ADD COLUMN IF NOT EXISTS "direccion" TEXT;
ALTER TABLE "LifePolicy" ADD COLUMN IF NOT EXISTS "provincia" TEXT;
ALTER TABLE "LifePolicy" ADD COLUMN IF NOT EXISTS "localidad" TEXT;

ALTER TABLE "Siniestro" ADD COLUMN IF NOT EXISTS "clienteTelefono" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN IF NOT EXISTS "clienteEmail" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN IF NOT EXISTS "terceroNombre" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN IF NOT EXISTS "terceroMarcaModeloVehiculo" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN IF NOT EXISTS "terceroDanios" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN IF NOT EXISTS "terceroCelular" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN IF NOT EXISTS "terceroDireccion" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN IF NOT EXISTS "terceroDni" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN IF NOT EXISTS "terceroAseguradora" TEXT;

ALTER TABLE "LifePolicy" DROP COLUMN IF EXISTS "altura";
ALTER TABLE "Siniestro" DROP COLUMN IF EXISTS "terceroNombreApellido";
ALTER TABLE "Siniestro" DROP COLUMN IF EXISTS "terceroMarcaModelo";
