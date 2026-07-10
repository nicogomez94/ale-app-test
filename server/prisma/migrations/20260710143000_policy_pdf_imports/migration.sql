-- CreateEnum
CREATE TYPE "PolicyImportStatus" AS ENUM ('PROCESSING', 'READY', 'INCOMPLETE', 'CONFIRMED', 'FAILED');

-- AlterTable
ALTER TABLE "Policy"
ADD COLUMN "premioTotal" DOUBLE PRECISION,
ADD COLUMN "cobertura" TEXT,
ADD COLUMN "endoso" TEXT,
ADD COLUMN "patente" TEXT,
ADD COLUMN "chasis" TEXT,
ADD COLUMN "motor" TEXT,
ADD COLUMN "direccionRiesgo" TEXT;

-- CreateTable
CREATE TABLE "PolicyDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "policyGroupId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyImportBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PolicyImportStatus" NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyImportDocument" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" "PolicyImportStatus" NOT NULL DEFAULT 'PROCESSING',
    "extractedText" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyImportDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyImportCandidate" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "PolicyImportStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "data" JSONB NOT NULL,
    "foundFields" JSONB NOT NULL,
    "missingFields" JSONB NOT NULL,
    "warnings" JSONB NOT NULL,
    "policyId" TEXT,
    "policyGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyImportCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PolicyDocument_storageKey_key" ON "PolicyDocument"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyDocument_userId_policyGroupId_key" ON "PolicyDocument"("userId", "policyGroupId");

-- CreateIndex
CREATE INDEX "PolicyDocument_userId_idx" ON "PolicyDocument"("userId");

-- CreateIndex
CREATE INDEX "PolicyDocument_policyGroupId_idx" ON "PolicyDocument"("policyGroupId");

-- CreateIndex
CREATE INDEX "PolicyImportBatch_userId_idx" ON "PolicyImportBatch"("userId");

-- CreateIndex
CREATE INDEX "PolicyImportBatch_status_idx" ON "PolicyImportBatch"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyImportDocument_storageKey_key" ON "PolicyImportDocument"("storageKey");

-- CreateIndex
CREATE INDEX "PolicyImportDocument_batchId_idx" ON "PolicyImportDocument"("batchId");

-- CreateIndex
CREATE INDEX "PolicyImportDocument_userId_idx" ON "PolicyImportDocument"("userId");

-- CreateIndex
CREATE INDEX "PolicyImportDocument_status_idx" ON "PolicyImportDocument"("status");

-- CreateIndex
CREATE INDEX "PolicyImportCandidate_batchId_idx" ON "PolicyImportCandidate"("batchId");

-- CreateIndex
CREATE INDEX "PolicyImportCandidate_documentId_idx" ON "PolicyImportCandidate"("documentId");

-- CreateIndex
CREATE INDEX "PolicyImportCandidate_userId_idx" ON "PolicyImportCandidate"("userId");

-- CreateIndex
CREATE INDEX "PolicyImportCandidate_status_idx" ON "PolicyImportCandidate"("status");

-- AddForeignKey
ALTER TABLE "PolicyDocument" ADD CONSTRAINT "PolicyDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyImportBatch" ADD CONSTRAINT "PolicyImportBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyImportDocument" ADD CONSTRAINT "PolicyImportDocument_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PolicyImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyImportDocument" ADD CONSTRAINT "PolicyImportDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyImportCandidate" ADD CONSTRAINT "PolicyImportCandidate_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PolicyImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyImportCandidate" ADD CONSTRAINT "PolicyImportCandidate_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "PolicyImportDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyImportCandidate" ADD CONSTRAINT "PolicyImportCandidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
