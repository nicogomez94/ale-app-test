import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { getCouponFilePath, validatePdfUpload } from "./couponStorage.js";
import { getExpiredPolicyGroups } from "./policyCleanup.js";
import {
  extractWhatsAppStatusUpdates,
  normalizeWhatsAppPhone,
  sendCouponTemplate,
  verifyWhatsAppSignature,
  WhatsAppNotConfiguredError,
} from "./whatsapp.js";

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
