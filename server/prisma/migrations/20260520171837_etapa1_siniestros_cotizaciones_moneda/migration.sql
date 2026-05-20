-- CreateEnum
CREATE TYPE "SiniestroEstado" AS ENUM ('DENUNCIADO', 'EN_GESTION', 'EN_INSPECCION', 'EN_ANALISIS', 'APROBADO', 'RECHAZADO', 'PAGADO');

-- CreateEnum
CREATE TYPE "SiniestroProioridad" AS ENUM ('ALTA', 'MEDIA', 'BAJA');

-- CreateEnum
CREATE TYPE "CotizacionTipo" AS ENUM ('AUTO', 'MOTO', 'HOGAR', 'OTROS');

-- CreateEnum
CREATE TYPE "CotizacionOrigen" AS ENUM ('MANUAL', 'LINK_PUBLICO');

-- CreateEnum
CREATE TYPE "CurrencyType" AS ENUM ('ARS', 'USD', 'EUR', 'BRL');

-- AlterTable
ALTER TABLE "Policy" ADD COLUMN     "moneda" "CurrencyType" NOT NULL DEFAULT 'ARS';

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SubscriptionProviderPlan" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Siniestro" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "numeroSiniestro" TEXT NOT NULL,
    "numeroPoliza" TEXT NOT NULL,
    "aseguradora" TEXT NOT NULL,
    "tipoSeguro" TEXT NOT NULL,
    "clienteNombre" TEXT NOT NULL,
    "clienteDni" TEXT,
    "fechaSiniestro" TIMESTAMP(3) NOT NULL,
    "horaSiniestro" TEXT,
    "lugarSiniestro" TEXT,
    "descripcion" TEXT NOT NULL,
    "patente" TEXT,
    "marcaModelo" TEXT,
    "tipoDanio" TEXT,
    "estado" "SiniestroEstado" NOT NULL DEFAULT 'DENUNCIADO',
    "prioridad" "SiniestroProioridad" NOT NULL DEFAULT 'BAJA',
    "responsable" TEXT,
    "importeReclamado" DOUBLE PRECISION,
    "deducible" DOUBLE PRECISION,
    "montoAprobado" DOUBLE PRECISION,
    "ultimoContactoAseguradora" TIMESTAMP(3),
    "ultimoContactoCliente" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Siniestro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiniestroNota" (
    "id" TEXT NOT NULL,
    "siniestroId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiniestroNota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cotizacion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "CotizacionTipo" NOT NULL,
    "origen" "CotizacionOrigen" NOT NULL DEFAULT 'MANUAL',
    "nombre" TEXT NOT NULL,
    "apellido" TEXT,
    "cuitCuil" TEXT,
    "fechaNacimiento" TEXT,
    "email" TEXT,
    "celular" TEXT,
    "calle" TEXT,
    "cp" TEXT,
    "localidad" TEXT,
    "provincia" TEXT,
    "marca" TEXT,
    "modelo" TEXT,
    "anio" INTEGER,
    "patente" TEXT,
    "tipoUso" TEXT,
    "tieneGnc" BOOLEAN,
    "tieneGps" BOOLEAN,
    "formaPago" TEXT,
    "tipoVivienda" TEXT,
    "superficieCubierta" DOUBLE PRECISION,
    "descripcionRiesgo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Siniestro_userId_idx" ON "Siniestro"("userId");

-- CreateIndex
CREATE INDEX "Siniestro_estado_idx" ON "Siniestro"("estado");

-- CreateIndex
CREATE INDEX "SiniestroNota_siniestroId_idx" ON "SiniestroNota"("siniestroId");

-- CreateIndex
CREATE INDEX "Cotizacion_userId_idx" ON "Cotizacion"("userId");

-- CreateIndex
CREATE INDEX "Cotizacion_tipo_idx" ON "Cotizacion"("tipo");

-- AddForeignKey
ALTER TABLE "Siniestro" ADD CONSTRAINT "Siniestro_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiniestroNota" ADD CONSTRAINT "SiniestroNota_siniestroId_fkey" FOREIGN KEY ("siniestroId") REFERENCES "Siniestro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
