-- Correcciones solicitadas para modulo 2.
ALTER TABLE "LifePolicy" ADD COLUMN "direccion" TEXT;
ALTER TABLE "LifePolicy" ADD COLUMN "localidad" TEXT;
ALTER TABLE "LifePolicy" ADD COLUMN "provincia" TEXT;

ALTER TABLE "Siniestro" ADD COLUMN "clienteTelefono" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN "clienteEmail" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN "terceroNombre" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN "terceroMarcaModeloVehiculo" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN "terceroDanios" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN "terceroCelular" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN "terceroDireccion" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN "terceroDni" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN "terceroAseguradora" TEXT;
