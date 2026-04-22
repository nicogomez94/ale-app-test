-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- AlterTable
ALTER TABLE "Subscription"
ADD COLUMN "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN "providerStatus" TEXT,
ADD COLUMN "mpPreapprovalId" TEXT,
ADD COLUMN "mpPreapprovalPlanId" TEXT,
ADD COLUMN "nextPaymentDate" TIMESTAMP(3),
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Payment"
ADD COLUMN "mpPreapprovalId" TEXT;

-- CreateTable
CREATE TABLE "SubscriptionProviderPlan" (
    "id" TEXT NOT NULL,
    "plan" "PlanType" NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "mpPreapprovalPlanId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionProviderPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_mpPreapprovalId_key" ON "Subscription"("mpPreapprovalId");

-- CreateIndex
CREATE INDEX "Subscription_mpPreapprovalPlanId_idx" ON "Subscription"("mpPreapprovalPlanId");

-- CreateIndex
CREATE INDEX "Payment_mpPaymentId_idx" ON "Payment"("mpPaymentId");

-- CreateIndex
CREATE INDEX "Payment_mpPreapprovalId_idx" ON "Payment"("mpPreapprovalId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionProviderPlan_mpPreapprovalPlanId_key" ON "SubscriptionProviderPlan"("mpPreapprovalPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionProviderPlan_plan_billingCycle_key" ON "SubscriptionProviderPlan"("plan", "billingCycle");

-- CreateIndex
CREATE INDEX "SubscriptionProviderPlan_status_idx" ON "SubscriptionProviderPlan"("status");
