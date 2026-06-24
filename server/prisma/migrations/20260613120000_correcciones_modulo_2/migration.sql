-- Correcciones solicitadas para modulo 2.
ALTER TABLE "LifePolicy" ADD COLUMN IF NOT EXISTS "direccion" TEXT;
ALTER TABLE "LifePolicy" ADD COLUMN IF NOT EXISTS "localidad" TEXT;
ALTER TABLE "LifePolicy" ADD COLUMN IF NOT EXISTS "provincia" TEXT;

ALTER TABLE "Siniestro" ADD COLUMN IF NOT EXISTS "clienteTelefono" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN IF NOT EXISTS "clienteEmail" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN IF NOT EXISTS "terceroNombre" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN IF NOT EXISTS "terceroMarcaModeloVehiculo" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN IF NOT EXISTS "terceroDanios" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN IF NOT EXISTS "terceroCelular" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN IF NOT EXISTS "terceroDireccion" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN IF NOT EXISTS "terceroDni" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN IF NOT EXISTS "terceroAseguradora" TEXT;
