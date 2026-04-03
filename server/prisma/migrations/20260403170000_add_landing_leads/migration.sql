-- CreateTable
CREATE TABLE "LandingContactLead" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "asunto" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingContactLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LandingProducerLead" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "provincia" TEXT,
    "experiencia" TEXT,
    "mensaje" TEXT,
    "cvOriginalName" TEXT,
    "cvMimeType" TEXT,
    "cvSizeBytes" INTEGER,
    "cvContent" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LandingProducerLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LandingContactLead_createdAt_idx" ON "LandingContactLead"("createdAt");

-- CreateIndex
CREATE INDEX "LandingProducerLead_createdAt_idx" ON "LandingProducerLead"("createdAt");
