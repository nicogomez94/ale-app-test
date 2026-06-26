-- Etapa A: campos de App Remix para accesos de aseguradoras y contacto de brokers
ALTER TABLE "InsuranceCompany" ADD COLUMN "portalLoginUrl" TEXT;
ALTER TABLE "Broker" ADD COLUMN "telefono" TEXT;
