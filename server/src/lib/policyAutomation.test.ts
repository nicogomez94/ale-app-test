import assert from "node:assert/strict";
import test from "node:test";
import { buildFirstCascadeQuotaData, buildQuotaSeriesData } from "../routes/policies.js";
import { countPolicyGroups } from "../middleware/planLimits.js";

const base = {
  fechaInicio: new Date("2026-01-31T12:00:00.000Z"),
  fechaVencimiento: new Date("2027-01-31T12:00:00.000Z"),
  prima: 1000,
  porcentajeComision: 10,
};

test("genera la cantidad de cuotas esperada con un unico groupId", () => {
  for (const total of [1, 2, 3, 6, 12]) {
    const rows = buildQuotaSeriesData(base, total, "group-1");
    assert.equal(rows.length, total);
    assert.deepEqual(rows.map((row) => row.cuotaActual), Array.from({ length: total }, (_, index) => index + 1));
    assert.ok(rows.every((row) => row.groupId === "group-1" && row.cuotaTotal === total && !row.pagada));
    assert.equal(rows.at(-1).fechaVencimiento.toISOString(), base.fechaVencimiento.toISOString());
  }
});

test("respeta fin de mes al calcular cuotas intermedias", () => {
  const rows = buildQuotaSeriesData(base, 3, "group-2");
  assert.equal(rows[0].fechaVencimiento.toISOString().slice(0, 10), "2026-02-28");
  assert.equal(rows[1].fechaVencimiento.toISOString().slice(0, 10), "2026-03-31");
});

test("la cascada comienza solamente con la primera cuota", () => {
  const row = buildFirstCascadeQuotaData(base, 12, "group-cascade");

  assert.equal(row.cuotaActual, 1);
  assert.equal(row.cuotaTotal, 12);
  assert.equal(row.groupId, "group-cascade");
  assert.equal(row.pagada, false);
  assert.equal(row.fechaVencimiento.toISOString().slice(0, 10), "2026-02-28");
});

test("el limite cuenta contratos y no filas de cuotas", () => {
  assert.equal(countPolicyGroups([
    { id: "a", groupId: "group-a" },
    { id: "b", groupId: "group-a" },
    { id: "c", groupId: "group-b" },
    { id: "legacy", groupId: null },
  ]), 3);
});
