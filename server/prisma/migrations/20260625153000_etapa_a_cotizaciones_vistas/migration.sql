-- Etapa A: indicador de cotizaciones nuevas sin visualizar
ALTER TABLE "Cotizacion" ADD COLUMN "viewedAt" TIMESTAMP(3);

CREATE INDEX "Cotizacion_viewedAt_idx" ON "Cotizacion"("viewedAt");
