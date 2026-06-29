CREATE TYPE "WeeklySummaryStatus" AS ENUM ('PROCESSING', 'ACCEPTED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

CREATE TABLE "WeeklySummaryDispatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "recipient" TEXT NOT NULL,
    "policyCount" INTEGER NOT NULL,
    "summaryText" TEXT NOT NULL,
    "totalChunks" INTEGER NOT NULL DEFAULT 1,
    "status" "WeeklySummaryStatus" NOT NULL DEFAULT 'PROCESSING',
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklySummaryDispatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WeeklySummaryMessage" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "metaMessageId" TEXT,
    "status" "WhatsAppDeliveryStatus" NOT NULL DEFAULT 'ACCEPTED',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklySummaryMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WeeklySummaryDispatch_userId_weekStart_key" ON "WeeklySummaryDispatch"("userId", "weekStart");
CREATE INDEX "WeeklySummaryDispatch_weekStart_idx" ON "WeeklySummaryDispatch"("weekStart");
CREATE INDEX "WeeklySummaryDispatch_status_idx" ON "WeeklySummaryDispatch"("status");

CREATE UNIQUE INDEX "WeeklySummaryMessage_metaMessageId_key" ON "WeeklySummaryMessage"("metaMessageId");
CREATE UNIQUE INDEX "WeeklySummaryMessage_dispatchId_chunkIndex_key" ON "WeeklySummaryMessage"("dispatchId", "chunkIndex");
CREATE INDEX "WeeklySummaryMessage_dispatchId_idx" ON "WeeklySummaryMessage"("dispatchId");
CREATE INDEX "WeeklySummaryMessage_status_idx" ON "WeeklySummaryMessage"("status");

ALTER TABLE "WeeklySummaryDispatch" ADD CONSTRAINT "WeeklySummaryDispatch_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WeeklySummaryMessage" ADD CONSTRAINT "WeeklySummaryMessage_dispatchId_fkey"
FOREIGN KEY ("dispatchId") REFERENCES "WeeklySummaryDispatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
