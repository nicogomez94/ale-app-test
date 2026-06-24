import assert from "node:assert/strict";
import test from "node:test";
import { getInvoicePendingAmount, getPaymentSyncedStatus, isValidInvoicePeriod } from "../routes/commissions.js";

test("valida periodos YYYY-MM", () => {
  assert.equal(isValidInvoicePeriod("2026-06"), true);
  assert.equal(isValidInvoicePeriod("Junio 2026"), false);
  assert.equal(isValidInvoicePeriod("2026-13"), false);
});

test("calcula saldo y estados de pagos parciales y completos", () => {
  assert.equal(getInvoicePendingAmount(1000, [{ monto: 250 }, { monto: 150 }]), 600);
  assert.equal(getPaymentSyncedStatus({ monto: 1000, estado: "FACTURADA" }, 400), "PARCIAL");
  assert.equal(getPaymentSyncedStatus({ monto: 1000, estado: "FACTURADA" }, 1000), "COBRADA");
  assert.equal(getPaymentSyncedStatus({ monto: 1000, estado: "PARCIAL" }, 0), "PENDIENTE");
});
