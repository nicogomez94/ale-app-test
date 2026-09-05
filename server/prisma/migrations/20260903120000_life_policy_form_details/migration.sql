ALTER TABLE "LifePolicy"
  ADD COLUMN "tipoSeguro" TEXT,
  ADD COLUMN "edad" INTEGER,
  ADD COLUMN "edadRetiro" INTEGER,
  ADD COLUMN "incremento" DOUBLE PRECISION,
  ADD COLUMN "frecuenciaIncremento" TEXT,
  ADD COLUMN "numeroPoliza" TEXT,
  ADD COLUMN "medioPago" TEXT,
  ADD COLUMN "fechaInicio" TIMESTAMP(3),
  ADD COLUMN "fechaVencimiento" TIMESTAMP(3),
  ADD COLUMN "vigencia" "PolicyVigencia",
  ADD COLUMN "moneda" "CurrencyType" NOT NULL DEFAULT 'ARS',
  ADD COLUMN "altura" TEXT;
