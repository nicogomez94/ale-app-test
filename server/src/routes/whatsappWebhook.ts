import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { extractWhatsAppStatusUpdates, verifyWhatsAppSignature } from "../lib/whatsapp.js";

export const whatsappWebhookRouter = Router();

whatsappWebhookRouter.get("/", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();

  if (mode === "subscribe" && expected && token === expected && typeof challenge === "string") {
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
});

whatsappWebhookRouter.post("/", async (req: Request, res: Response) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
  const signature = req.header("x-hub-signature-256");
  if (!verifyWhatsAppSignature(rawBody, signature)) {
    res.sendStatus(401);
    return;
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    res.sendStatus(400);
    return;
  }

  const rank = { ACCEPTED: 0, SENT: 1, DELIVERED: 2, READ: 3, FAILED: 4 } as const;
  for (const update of extractWhatsAppStatusUpdates(payload)) {
    try {
      const delivery = await prisma.whatsAppCouponDelivery.findUnique({
        where: { metaMessageId: update.messageId },
        select: { id: true, status: true },
      });
      if (!delivery || (update.status !== "FAILED" && rank[update.status] < rank[delivery.status])) continue;
      await prisma.whatsAppCouponDelivery.update({
        where: { id: delivery.id },
        data: {
          status: update.status,
          errorCode: update.errorCode,
          errorMessage: update.errorMessage,
        },
      });
    } catch (error) {
      console.error(`[WhatsAppWebhook] No se pudo actualizar ${update.messageId}:`, error);
    }
  }
  res.sendStatus(200);
});
