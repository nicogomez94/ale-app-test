import { createHmac, timingSafeEqual } from "node:crypto";
import { parsePhoneNumberFromString } from "libphonenumber-js";

type TemplateInput = {
  recipient: string;
  document: Buffer;
  filename: string;
  clientName: string;
  policyNumber: string;
  insurer: string;
  dueDate: string;
  producerName: string;
};

type WhatsAppConfig = {
  graphVersion: string;
  accessToken: string;
  phoneNumberId: string;
  templateName: string;
  templateLanguage: string;
  weeklyTemplateName: string;
  weeklyTemplateLanguage: string;
};

export class WhatsAppNotConfiguredError extends Error {
  constructor() {
    super("whatsapp_not_configured");
  }
}

function getConfig(): WhatsAppConfig {
  const config = {
    graphVersion: process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || "",
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN?.trim() || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || "",
    templateName: process.env.WHATSAPP_TEMPLATE_NAME?.trim() || "aviso_vencimiento_cuponera",
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || "es_AR",
    weeklyTemplateName: process.env.WHATSAPP_WEEKLY_TEMPLATE_NAME?.trim() || "resumen_semanal_vencimientos",
    weeklyTemplateLanguage: process.env.WHATSAPP_WEEKLY_TEMPLATE_LANGUAGE?.trim() || "es_AR",
  };
  if (!config.graphVersion || !config.accessToken || !config.phoneNumberId) {
    throw new WhatsAppNotConfiguredError();
  }
  if (!/^v\d+\.\d+$/.test(config.graphVersion) || !/^\d+$/.test(config.phoneNumberId)) {
    throw new WhatsAppNotConfiguredError();
  }
  return config;
}

export function normalizeWhatsAppPhone(rawPhone: string): string {
  const defaultCountry = (process.env.WHATSAPP_DEFAULT_COUNTRY || "AR").toUpperCase() as any;
  const parsed = parsePhoneNumberFromString(rawPhone.trim(), defaultCountry);
  if (!parsed?.isValid()) throw new Error("invalid_phone");
  return parsed.number.replace(/^\+/, "");
}

async function parseMetaResponse(response: Response): Promise<any> {
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error: any = new Error(payload?.error?.message || `Meta API error ${response.status}`);
    error.code = String(payload?.error?.code || response.status);
    throw error;
  }
  return payload;
}

export async function sendCouponTemplate(input: TemplateInput): Promise<{ messageId: string; mediaId: string }> {
  const config = getConfig();
  const baseUrl = `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}`;
  const mediaForm = new FormData();
  mediaForm.append("messaging_product", "whatsapp");
  mediaForm.append("type", "application/pdf");
  mediaForm.append("file", new Blob([new Uint8Array(input.document)], { type: "application/pdf" }), input.filename);

  const mediaResponse = await fetch(`${baseUrl}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.accessToken}` },
    body: mediaForm,
  });
  const mediaPayload = await parseMetaResponse(mediaResponse);
  const mediaId = String(mediaPayload.id || "");
  if (!mediaId) throw new Error("Meta no devolvió el identificador del PDF");

  const messageResponse = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: input.recipient,
      type: "template",
      template: {
        name: config.templateName,
        language: { code: config.templateLanguage },
        components: [
          {
            type: "header",
            parameters: [{ type: "document", document: { id: mediaId, filename: input.filename } }],
          },
          {
            type: "body",
            parameters: [
              { type: "text", text: input.clientName },
              { type: "text", text: input.policyNumber },
              { type: "text", text: input.insurer },
              { type: "text", text: input.dueDate },
              { type: "text", text: input.producerName },
            ],
          },
        ],
      },
    }),
  });
  const messagePayload = await parseMetaResponse(messageResponse);
  const messageId = String(messagePayload?.messages?.[0]?.id || "");
  if (!messageId) throw new Error("Meta no devolvió el identificador del mensaje");
  return { messageId, mediaId };
}

export async function sendWeeklySummaryTemplate(input: {
  recipient: string;
  producerName: string;
  summaryChunk: string;
}): Promise<{ messageId: string }> {
  const config = getConfig();
  const response = await fetch(`https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: input.recipient,
      type: "template",
      template: {
        name: config.weeklyTemplateName,
        language: { code: config.weeklyTemplateLanguage },
        components: [{
          type: "body",
          parameters: [
            { type: "text", text: input.producerName },
            { type: "text", text: input.summaryChunk },
          ],
        }],
      },
    }),
  });
  const payload = await parseMetaResponse(response);
  const messageId = String(payload?.messages?.[0]?.id || "");
  if (!messageId) throw new Error("Meta no devolvió el identificador del resumen semanal");
  return { messageId };
}

export function verifyWhatsAppSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!appSecret || !signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const received = signatureHeader.slice("sha256=".length);
  if (received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received, "hex"), Buffer.from(expected, "hex"));
}

export type WebhookStatusUpdate = {
  messageId: string;
  status: "SENT" | "DELIVERED" | "READ" | "FAILED";
  errorCode: string | null;
  errorMessage: string | null;
};

export function extractWhatsAppStatusUpdates(payload: any): WebhookStatusUpdate[] {
  const updates: WebhookStatusUpdate[] = [];
  for (const entry of payload?.entry || []) {
    for (const change of entry?.changes || []) {
      for (const item of change?.value?.statuses || []) {
        const normalized = String(item?.status || "").toUpperCase();
        if (!item?.id || !["SENT", "DELIVERED", "READ", "FAILED"].includes(normalized)) continue;
        const firstError = item?.errors?.[0];
        updates.push({
          messageId: String(item.id),
          status: normalized as WebhookStatusUpdate["status"],
          errorCode: firstError?.code != null ? String(firstError.code) : null,
          errorMessage: firstError?.title || firstError?.message || firstError?.error_data?.details || null,
        });
      }
    }
  }
  return updates;
}
