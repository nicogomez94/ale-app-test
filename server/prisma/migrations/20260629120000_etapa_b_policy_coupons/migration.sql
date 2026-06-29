CREATE TYPE "WhatsAppDeliveryStatus" AS ENUM ('ACCEPTED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

CREATE TABLE "PolicyCoupon" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "policyGroupId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyCoupon_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsAppCouponDelivery" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "metaMessageId" TEXT,
    "status" "WhatsAppDeliveryStatus" NOT NULL DEFAULT 'ACCEPTED',
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppCouponDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PolicyCoupon_storageKey_key" ON "PolicyCoupon"("storageKey");
CREATE UNIQUE INDEX "PolicyCoupon_userId_policyGroupId_key" ON "PolicyCoupon"("userId", "policyGroupId");
CREATE INDEX "PolicyCoupon_userId_idx" ON "PolicyCoupon"("userId");
CREATE INDEX "PolicyCoupon_policyGroupId_idx" ON "PolicyCoupon"("policyGroupId");

CREATE UNIQUE INDEX "WhatsAppCouponDelivery_metaMessageId_key" ON "WhatsAppCouponDelivery"("metaMessageId");
CREATE INDEX "WhatsAppCouponDelivery_couponId_createdAt_idx" ON "WhatsAppCouponDelivery"("couponId", "createdAt");
CREATE INDEX "WhatsAppCouponDelivery_userId_idx" ON "WhatsAppCouponDelivery"("userId");
CREATE INDEX "WhatsAppCouponDelivery_policyId_idx" ON "WhatsAppCouponDelivery"("policyId");
CREATE INDEX "WhatsAppCouponDelivery_status_idx" ON "WhatsAppCouponDelivery"("status");

ALTER TABLE "PolicyCoupon" ADD CONSTRAINT "PolicyCoupon_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WhatsAppCouponDelivery" ADD CONSTRAINT "WhatsAppCouponDelivery_couponId_fkey"
FOREIGN KEY ("couponId") REFERENCES "PolicyCoupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WhatsAppCouponDelivery" ADD CONSTRAINT "WhatsAppCouponDelivery_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
