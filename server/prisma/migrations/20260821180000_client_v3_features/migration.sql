ALTER TABLE "Client" ADD COLUMN "fechaNacimiento" TIMESTAMP(3);

ALTER TABLE "Cotizacion"
  ADD COLUMN "clientId" TEXT,
  ADD COLUMN "managedAt" TIMESTAMP(3);

ALTER TABLE "Cotizacion"
  ADD CONSTRAINT "Cotizacion_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Cotizacion_clientId_idx" ON "Cotizacion"("clientId");

ALTER TABLE "CommissionInvoice" ADD COLUMN "numeroLiquidacion" TEXT;

CREATE TABLE "MessageTemplate" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "categoria" TEXT NOT NULL DEFAULT 'GENERAL',
  "contenido" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MessageTemplate_userId_idx" ON "MessageTemplate"("userId");
CREATE INDEX "MessageTemplate_categoria_idx" ON "MessageTemplate"("categoria");
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Suggestion" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "asunto" TEXT NOT NULL,
  "mensaje" TEXT NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
  "respuesta" TEXT,
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Suggestion_userId_idx" ON "Suggestion"("userId");
CREATE INDEX "Suggestion_estado_idx" ON "Suggestion"("estado");
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
