CREATE TABLE "PlanConfiguration" (
    "id" TEXT NOT NULL,
    "plan" "PlanType" NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyPrice" DOUBLE PRECISION NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "annualEnabled" BOOLEAN NOT NULL DEFAULT true,
    "annualDiscountMonths" INTEGER NOT NULL DEFAULT 2,
    "features" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlanConfiguration_plan_key" ON "PlanConfiguration"("plan");

DROP INDEX IF EXISTS "SubscriptionProviderPlan_plan_billingCycle_key";
CREATE INDEX "SubscriptionProviderPlan_plan_billingCycle_idx" ON "SubscriptionProviderPlan"("plan", "billingCycle");
