import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { getCouponFilePath, validatePdfUpload } from "./couponStorage.js";
import { getExpiredPolicyGroups } from "./policyCleanup.js";
import {
  extractWhatsAppStatusUpdates,
  normalizeWhatsAppPhone,
  sendCouponTemplate,
  sendWeeklySummaryTemplate,
  verifyWhatsAppSignature,
  WhatsAppNotConfiguredError,
} from "./whatsapp.js";
import { buildWeeklySummaryChunks, canAttemptWeeklyDispatch, getWeekStartForBuenosAires, isWeeklySummaryDue } from "./weeklySummary.js";

test("acepta PDF real y rechaza extensión, MIME o firma inválidos", () => {
  const valid = Buffer.from("%PDF-1.7\ncontenido");
  assert.doesNotThrow(() => validatePdfUpload({ originalname: "cuponera.pdf", mimetype: "application/pdf", buffer: valid, size: valid.length }));
  assert.throws(() => validatePdfUpload({ originalname: "cuponera.txt", mimetype: "application/pdf", buffer: valid, size: valid.length }), /invalid_pdf/);
  assert.throws(() => validatePdfUpload({ originalname: "cuponera.pdf", mimetype: "text/plain", buffer: valid, size: valid.length }), /invalid_pdf/);
  assert.throws(() => validatePdfUpload({ originalname: "cuponera.pdf", mimetype: "application/pdf", buffer: Buffer.alloc(0), size: 0 }), /invalid_pdf/);
  assert.throws(() => validatePdfUpload({ originalname: "cuponera.pdf", mimetype: "application/pdf", buffer: Buffer.from("archivo falso"), size: 13 }), /invalid_pdf/);
  const previousMax = process.env.COUPON_MAX_BYTES;
  process.env.COUPON_MAX_BYTES = "8";
  assert.throws(() => validatePdfUpload({ originalname: "cuponera.pdf", mimetype: "application/pdf", buffer: valid, size: valid.length }), /pdf_too_large/);
  if (previousMax == null) delete process.env.COUPON_MAX_BYTES;
  else process.env.COUPON_MAX_BYTES = previousMax;
});

test("impide claves de almacenamiento con path traversal", () => {
  assert.throws(() => getCouponFilePath("../secreto.pdf"), /invalid_storage_key/);
  assert.match(getCouponFilePath("123e4567-e89b-12d3-a456-426614174000.pdf"), /123e4567-e89b-12d3-a456-426614174000\.pdf$/);
});

test("elimina un grupo solo cuando su vencimiento más reciente supera 60 días", () => {
  const now = new Date("2026-06-29T12:00:00.000Z");
  const groups = getExpiredPolicyGroups([
    { id: "a1", userId: "u1", groupId: "old", fechaVencimiento: new Date("2026-03-01T00:00:00.000Z") },
    { id: "a2", userId: "u1", groupId: "old", fechaVencimiento: new Date("2026-04-01T00:00:00.000Z") },
    { id: "b1", userId: "u1", groupId: "recent", fechaVencimiento: new Date("2026-06-01T00:00:00.000Z") },
    { id: "legacy", userId: "u2", groupId: null, fechaVencimiento: new Date("2026-01-01T00:00:00.000Z") },
  ], now);
  assert.deepEqual(groups.map((group) => group.policyGroupId).sort(), ["legacy", "old"]);
  assert.deepEqual(groups.find((group) => group.policyGroupId === "old")?.memberIds, ["a1", "a2"]);
});

test("normaliza un celular argentino a WhatsApp E.164", () => {
  process.env.WHATSAPP_DEFAULT_COUNTRY = "AR";
  assert.equal(normalizeWhatsAppPhone("+54 9 11 2345-6789"), "5491123456789");
  assert.throws(() => normalizeWhatsAppPhone("123"), /invalid_phone/);
});

test("verifica firma y extrae estados del webhook", () => {
  process.env.WHATSAPP_APP_SECRET = "test-secret";
  const body = Buffer.from(JSON.stringify({
    entry: [{ changes: [{ value: { statuses: [{ id: "wamid.1", status: "delivered" }, { id: "wamid.2", status: "failed", errors: [{ code: 131000, title: "Error de Meta" }] }] } }] }],
  }));
  const signature = `sha256=${createHmac("sha256", "test-secret").update(body).digest("hex")}`;
  assert.equal(verifyWhatsAppSignature(body, signature), true);
  assert.equal(verifyWhatsAppSignature(body, "sha256=00"), false);
  assert.deepEqual(extractWhatsAppStatusUpdates(JSON.parse(body.toString())), [
    { messageId: "wamid.1", status: "DELIVERED", errorCode: null, errorMessage: null },
    { messageId: "wamid.2", status: "FAILED", errorCode: "131000", errorMessage: "Error de Meta" },
  ]);
});

test("arma upload y plantilla documental para Meta", async () => {
  process.env.WHATSAPP_GRAPH_API_VERSION = "v99.0";
  process.env.WHATSAPP_ACCESS_TOKEN = "token-test";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "123456";
  process.env.WHATSAPP_TEMPLATE_NAME = "aviso_vencimiento_cuponera";
  process.env.WHATSAPP_TEMPLATE_LANGUAGE = "es_AR";
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return calls.length === 1
      ? new Response(JSON.stringify({ id: "media-1" }), { status: 200, headers: { "Content-Type": "application/json" } })
      : new Response(JSON.stringify({ messages: [{ id: "wamid.1" }] }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;

  try {
    const result = await sendCouponTemplate({
      recipient: "5491123456789",
      document: Buffer.from("%PDF-1.7"),
      filename: "cuponera-123.pdf",
      clientName: "Cliente Prueba",
      policyNumber: "123",
      insurer: "Aseguradora",
      dueDate: "29/06/2026",
      producerName: "PAS Prueba",
    });
    assert.deepEqual(result, { messageId: "wamid.1", mediaId: "media-1" });
    assert.match(calls[0].url, /\/123456\/media$/);
    const messageBody = JSON.parse(String(calls[1].init?.body));
    assert.equal(messageBody.type, "template");
    assert.equal(messageBody.template.components[0].parameters[0].document.id, "media-1");
    assert.equal(messageBody.template.components[1].parameters.length, 5);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("calcula el lunes 08:00 de Argentina y la clave semanal", () => {
  assert.equal(isWeeklySummaryDue(new Date("2026-06-29T10:59:00.000Z")), false);
  assert.equal(isWeeklySummaryDue(new Date("2026-06-29T11:00:00.000Z")), true);
  assert.equal(isWeeklySummaryDue(new Date("2026-06-30T14:00:00.000Z")), false);
  assert.equal(getWeekStartForBuenosAires(new Date("2026-07-05T20:00:00.000Z")).toISOString(), "2026-06-29T00:00:00.000Z");
});

test("divide resúmenes extensos sin perder pólizas y contempla el caso vacío", () => {
  const policies = Array.from({ length: 12 }, (_, index) => ({
    clienteNombre: `Cliente ${index + 1}`,
    numeroPoliza: `POL-${index + 1}`,
    aseguradora: "Aseguradora de prueba",
    fechaVencimiento: new Date(`2026-07-${String((index % 7) + 1).padStart(2, "0")}T12:00:00.000Z`),
  }));
  const result = buildWeeklySummaryChunks(policies, 300);
  assert.ok(result.chunks.length > 1);
  for (let index = 1; index <= policies.length; index++) {
    assert.match(result.summaryText, new RegExp(`POL-${index}(?!\\d)`));
  }
  assert.deepEqual(buildWeeklySummaryChunks([]).chunks, ["No hay pólizas a vencer en los próximos 7 días."]);
});

test("controla duplicados y reintentos del resumen semanal", () => {
  const now = new Date("2026-06-29T12:00:00.000Z");
  assert.equal(canAttemptWeeklyDispatch(null, now), true);
  assert.equal(canAttemptWeeklyDispatch({ status: "DELIVERED", attemptCount: 1, lastAttemptAt: now }, now, true), false);
  assert.equal(canAttemptWeeklyDispatch({ status: "FAILED", attemptCount: 1, lastAttemptAt: new Date(now.getTime() - 31 * 60 * 1000) }, now), true);
  assert.equal(canAttemptWeeklyDispatch({ status: "FAILED", attemptCount: 3, lastAttemptAt: new Date(0) }, now), false);
});

test("arma la plantilla Meta del resumen semanal", async () => {
  process.env.WHATSAPP_GRAPH_API_VERSION = "v99.0";
  process.env.WHATSAPP_ACCESS_TOKEN = "token-test";
  process.env.WHATSAPP_PHONE_NUMBER_ID = "123456";
  process.env.WHATSAPP_WEEKLY_TEMPLATE_NAME = "resumen_semanal_vencimientos";
  process.env.WHATSAPP_WEEKLY_TEMPLATE_LANGUAGE = "es_AR";
  const originalFetch = globalThis.fetch;
  let body: any;
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    body = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ messages: [{ id: "wamid.weekly" }] }), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  try {
    const result = await sendWeeklySummaryTemplate({ recipient: "5491123456789", producerName: "PAS Prueba", summaryChunk: "Sin vencimientos" });
    assert.deepEqual(result, { messageId: "wamid.weekly" });
    assert.equal(body.template.name, "resumen_semanal_vencimientos");
    assert.deepEqual(body.template.components[0].parameters.map((item: any) => item.text), ["PAS Prueba", "Sin vencimientos"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rechaza el envío cuando Meta no está configurado", async () => {
  delete process.env.WHATSAPP_GRAPH_API_VERSION;
  delete process.env.WHATSAPP_ACCESS_TOKEN;
  delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  await assert.rejects(
    sendCouponTemplate({
      recipient: "5491123456789",
      document: Buffer.from("%PDF-1.7"),
      filename: "cuponera.pdf",
      clientName: "Cliente",
      policyNumber: "1",
      insurer: "Aseguradora",
      dueDate: "29/06/2026",
      producerName: "PAS",
    }),
    WhatsAppNotConfiguredError
  );
});
