-- AlterTable
ALTER TABLE "LifePolicy" ADD COLUMN "direccion" TEXT;
ALTER TABLE "LifePolicy" ADD COLUMN "altura" TEXT;
ALTER TABLE "LifePolicy" ADD COLUMN "provincia" TEXT;
ALTER TABLE "LifePolicy" ADD COLUMN "localidad" TEXT;

-- AlterTable
ALTER TABLE "Siniestro" ADD COLUMN "terceroNombreApellido" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN "terceroMarcaModelo" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN "terceroDanios" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN "terceroCelular" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN "terceroDireccion" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN "terceroDni" TEXT;
ALTER TABLE "Siniestro" ADD COLUMN "terceroAseguradora" TEXT;
