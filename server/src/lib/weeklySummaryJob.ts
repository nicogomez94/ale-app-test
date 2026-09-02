import prisma from "./prisma.js";
import { normalizeWhatsAppPhone, sendWeeklySummaryTemplate, WhatsAppNotConfiguredError } from "./whatsapp.js";
import {
  buildWeeklySummaryChunks,
  canAttemptWeeklyDispatch,
  getWeekStartForBuenosAires,
  isWeeklySummaryDue,
} from "./weeklySummary.js";

let weeklyJobRunning = false;

export type WeeklySummaryJobResult = {
  status: "ok" | "skipped";
  processed: number;
  accepted: number;
  failed: number;
  duplicates: number;
};

function getChunkMaxChars(): number {
  const configured = Number(process.env.WHATSAPP_WEEKLY_CHUNK_MAX_CHARS);
  return Number.isInteger(configured) && configured >= 300 && configured <= 3000 ? configured : 900;
}

export async function refreshWeeklyDispatchStatus(dispatchId: string): Promise<void> {
  const dispatch = await prisma.weeklySummaryDispatch.findUnique({
    where: { id: dispatchId },
    include: { messages: true },
  });
  if (!dispatch || dispatch.messages.length === 0) return;

  let status: "ACCEPTED" | "SENT" | "DELIVERED" | "READ" | "FAILED" = "ACCEPTED";
  if (dispatch.messages.some((message) => message.status === "FAILED")) status = "FAILED";
  else if (dispatch.messages.length === dispatch.totalChunks && dispatch.messages.every((message) => message.status === "READ")) status = "READ";
  else if (dispatch.messages.length === dispatch.totalChunks && dispatch.messages.every((message) => ["DELIVERED", "READ"].includes(message.status))) status = "DELIVERED";
  else if (dispatch.messages.length === dispatch.totalChunks && dispatch.messages.every((message) => ["SENT", "DELIVERED", "READ"].includes(message.status))) status = "SENT";

  await prisma.weeklySummaryDispatch.update({
    where: { id: dispatch.id },
    data: { status },
  });
}

export async function runWeeklySummaryJob(options: {
  onlyTestUsers?: boolean;
  force?: boolean;
  now?: Date;
} = {}): Promise<WeeklySummaryJobResult> {
  const now = options.now || new Date();
  const force = options.force === true;
  if (!force && !isWeeklySummaryDue(now)) {
    return { status: "skipped", processed: 0, accepted: 0, failed: 0, duplicates: 0 };
  }
  if (weeklyJobRunning) {
    return { status: "skipped", processed: 0, accepted: 0, failed: 0, duplicates: 0 };
  }
  weeklyJobRunning = true;

  const result: WeeklySummaryJobResult = { status: "ok", processed: 0, accepted: 0, failed: 0, duplicates: 0 };
  try {
    const weekStart = getWeekStartForBuenosAires(now);
    const windowEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const users = await prisma.user.findMany({
      where: {
        isAdmin: false,
        estado: "ACTIVO",
        ...(options.onlyTestUsers ? { isTestUser: true } : {}),
      },
      select: { id: true, nombre: true, telefono: true },
      orderBy: { createdAt: "asc" },
    });

    for (const user of users) {
      const policies = await prisma.policy.findMany({
        where: { userId: user.id, pagada: false, fechaVencimiento: { gte: weekStart, lte: windowEnd } },
        select: { clienteNombre: true, numeroPoliza: true, aseguradora: true, medioPago: true, fechaVencimiento: true },
        orderBy: { fechaVencimiento: "asc" },
      });
      const summary = buildWeeklySummaryChunks(policies, getChunkMaxChars());
      const existing = await prisma.weeklySummaryDispatch.findUnique({
        where: { userId_weekStart: { userId: user.id, weekStart } },
        include: { messages: true },
      });
      if (!canAttemptWeeklyDispatch(existing, now, force)) {
        result.duplicates++;
        continue;
      }

      result.processed++;
      let recipient = user.telefono?.trim() || "";
      try {
        recipient = normalizeWhatsAppPhone(recipient);
      } catch {
        await prisma.weeklySummaryDispatch.upsert({
          where: { userId_weekStart: { userId: user.id, weekStart } },
          create: {
            userId: user.id,
            weekStart,
            recipient,
            policyCount: policies.length,
            summaryText: summary.summaryText,
            totalChunks: summary.chunks.length,
            status: "FAILED",
            errorCode: "invalid_phone",
            errorMessage: "El PAS no tiene un teléfono válido para WhatsApp.",
          },
          update: {
            recipient,
            policyCount: policies.length,
            summaryText: summary.summaryText,
            totalChunks: summary.chunks.length,
            status: "FAILED",
            attemptCount: { increment: 1 },
            lastAttemptAt: now,
            errorCode: "invalid_phone",
            errorMessage: "El PAS no tiene un teléfono válido para WhatsApp.",
          },
        });
        result.failed++;
        continue;
      }

      const dispatch = await prisma.weeklySummaryDispatch.upsert({
        where: { userId_weekStart: { userId: user.id, weekStart } },
        create: {
          userId: user.id,
          weekStart,
          recipient,
          policyCount: policies.length,
          summaryText: summary.summaryText,
          totalChunks: summary.chunks.length,
          status: "PROCESSING",
          lastAttemptAt: now,
        },
        update: {
          recipient,
          policyCount: policies.length,
          summaryText: summary.summaryText,
          totalChunks: summary.chunks.length,
          status: "PROCESSING",
          attemptCount: { increment: 1 },
          lastAttemptAt: now,
          errorCode: null,
          errorMessage: null,
        },
        include: { messages: true },
      });

      try {
        for (let index = 0; index < summary.chunks.length; index++) {
          const previousMessage = dispatch.messages.find((message) => message.chunkIndex === index);
          if (previousMessage && previousMessage.status !== "FAILED") continue;
          try {
            const sent = await sendWeeklySummaryTemplate({
              recipient,
              producerName: user.nombre,
              summaryChunk: summary.chunks[index],
            });
            await prisma.weeklySummaryMessage.upsert({
              where: { dispatchId_chunkIndex: { dispatchId: dispatch.id, chunkIndex: index } },
              create: { dispatchId: dispatch.id, chunkIndex: index, metaMessageId: sent.messageId, status: "ACCEPTED" },
              update: { metaMessageId: sent.messageId, status: "ACCEPTED", errorCode: null, errorMessage: null },
            });
          } catch (error: any) {
            const notConfigured = error instanceof WhatsAppNotConfiguredError;
            await prisma.weeklySummaryMessage.upsert({
              where: { dispatchId_chunkIndex: { dispatchId: dispatch.id, chunkIndex: index } },
              create: {
                dispatchId: dispatch.id,
                chunkIndex: index,
                status: "FAILED",
                errorCode: notConfigured ? "whatsapp_not_configured" : String(error?.code || "whatsapp_send_failed"),
                errorMessage: String(error?.message || "Meta rechazó el resumen semanal.").slice(0, 1000),
              },
              update: {
                metaMessageId: null,
                status: "FAILED",
                errorCode: notConfigured ? "whatsapp_not_configured" : String(error?.code || "whatsapp_send_failed"),
                errorMessage: String(error?.message || "Meta rechazó el resumen semanal.").slice(0, 1000),
              },
            });
            throw error;
          }
        }

        await prisma.weeklySummaryDispatch.update({
          where: { id: dispatch.id },
          data: { status: "ACCEPTED", sentAt: now, errorCode: null, errorMessage: null },
        });
        result.accepted++;
      } catch (error: any) {
        const notConfigured = error instanceof WhatsAppNotConfiguredError;
        await prisma.weeklySummaryDispatch.update({
          where: { id: dispatch.id },
          data: {
            status: "FAILED",
            errorCode: notConfigured ? "whatsapp_not_configured" : String(error?.code || "whatsapp_send_failed"),
            errorMessage: String(error?.message || "Meta rechazó el resumen semanal.").slice(0, 1000),
          },
        });
        result.failed++;
      }
    }
    return result;
  } finally {
    weeklyJobRunning = false;
  }
}
