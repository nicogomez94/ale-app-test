import assert from "node:assert/strict";
import test from "node:test";
import { BillingCycle } from "../../node_modules/.prisma/client/default.js";
import { getCyclePrice } from "./planCatalog.js";

test("el plan anual cobra diez meses y conserva el mensual", () => {
  const config = { monthlyPrice: 14_900, annualDiscountMonths: 2 };

  assert.equal(getCyclePrice(config, BillingCycle.MONTHLY), 14_900);
  assert.equal(getCyclePrice(config, BillingCycle.ANNUAL), 149_000);
});
