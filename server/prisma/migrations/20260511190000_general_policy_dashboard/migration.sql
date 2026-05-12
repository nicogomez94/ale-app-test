-- CreateEnum
CREATE TYPE "PolicyVigencia" AS ENUM ('MENSUAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "InteractionChannel" AS ENUM ('WHATSAPP', 'EMAIL');

-- AlterTable
ALTER TABLE "Client"
ADD COLUMN "altura" TEXT,
ADD COLUMN "provincia" TEXT,
ADD COLUMN "localidad" TEXT;

-- AlterTable
ALTER TABLE "Company"
ADD COLUMN "altura" TEXT,
ADD COLUMN "provincia" TEXT,
ADD COLUMN "localidad" TEXT;

-- AlterTable
ALTER TABLE "Policy"
ADD COLUMN "clienteEmail" TEXT,
ADD COLUMN "vigencia" "PolicyVigencia" NOT NULL DEFAULT 'ANUAL',
ADD COLUMN "cuotaActual" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "cuotaTotal" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "groupId" TEXT,
ADD COLUMN "pagada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "fechaPago" TIMESTAMP(3),
ADD COLUMN "ultimaGestionTipo" "InteractionChannel",
ADD COLUMN "ultimaGestionFecha" TIMESTAMP(3),
ADD COLUMN "ultimaGestionWhatsappCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "ultimaGestionMailCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "Policy"
SET
  "clienteEmail" = COALESCE(
    "clienteEmail",
    (SELECT c."email" FROM "Client" c WHERE c."id" = "Policy"."clienteId"),
    (SELECT co."email" FROM "Company" co WHERE co."id" = "Policy"."companyId")
  ),
  "vigencia" = CASE
    WHEN DATE_PART('day', "fechaVencimiento" - "fechaInicio") <= 45 THEN 'MENSUAL'::"PolicyVigencia"
    WHEN DATE_PART('day', "fechaVencimiento" - "fechaInicio") <= 75 THEN 'BIMESTRAL'::"PolicyVigencia"
    WHEN DATE_PART('day', "fechaVencimiento" - "fechaInicio") <= 120 THEN 'TRIMESTRAL'::"PolicyVigencia"
    WHEN DATE_PART('day', "fechaVencimiento" - "fechaInicio") <= 220 THEN 'SEMESTRAL'::"PolicyVigencia"
    ELSE 'ANUAL'::"PolicyVigencia"
  END,
  "groupId" = COALESCE("groupId", "id"),
  "cuotaActual" = COALESCE("cuotaActual", 1),
  "cuotaTotal" = COALESCE("cuotaTotal", 1),
  "pagada" = COALESCE("pagada", false),
  "ultimaGestionWhatsappCount" = COALESCE("ultimaGestionWhatsappCount", 0),
  "ultimaGestionMailCount" = COALESCE("ultimaGestionMailCount", 0);
