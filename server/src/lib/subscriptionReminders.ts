import prisma from "./prisma.js";
import { sendEmail } from "./email.js";

const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function sendReminders(): Promise<void> {
  const now = new Date();
  const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  // Find users whose access expires within the next 5 days (trial and paid)
  const users = await prisma.user.findMany({
    where: {
      estado: "ACTIVO",
      OR: [
        {
          plan: { not: "TRIAL" },
          planVencimiento: { gt: now, lte: in5Days },
        },
        {
          plan: "TRIAL",
          trialFin: { gt: now, lte: in5Days },
        },
      ],
    },
    select: {
      nombre: true,
      email: true,
      plan: true,
      planVencimiento: true,
      trialFin: true,
    },
  });

  for (const user of users) {
    const vencimiento = user.plan === "TRIAL" ? user.trialFin : user.planVencimiento;
    if (!vencimiento) continue;

    const daysRemaining = Math.ceil(
      (vencimiento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const isTrial = user.plan === "TRIAL";
    const planLabel = isTrial ? "período de prueba" : "suscripción";
    const daysText = daysRemaining === 1 ? "1 día" : `${daysRemaining} días`;

    const message = isTrial
      ? `Tu ${planLabel} de PAS Alert vence en ${daysText}.\n\nPara seguir gestionando tu cartera sin interrupciones, activá un plan desde la sección Suscripción dentro de la plataforma.\n\n¡Gracias por usar PAS Alert!`
      : `Tu ${planLabel} de PAS Alert vence en ${daysText}.\n\nRenová tu plan desde la sección Suscripción dentro de la plataforma para mantener el acceso a tu cartera.\n\n¡Gracias por usar PAS Alert!`;

    try {
      await sendEmail({
        name: user.nombre,
        email: user.email,
        to: user.email,
        message,
      });
      console.log(`[Reminders] Email enviado a ${user.email} (vence en ${daysText})`);
    } catch (err) {
      console.error(`[Reminders] Error enviando email a ${user.email}:`, err);
    }
  }

  if (users.length === 0) {
    console.log("[Reminders] Sin vencimientos próximos hoy.");
  }
}

export function startSubscriptionReminders(): void {
  // Run once at startup after a short delay to let the server settle
  setTimeout(() => {
    sendReminders().catch((err) =>
      console.error("[Reminders] Error en ciclo inicial:", err)
    );
  }, 10_000);

  // Then run every 24 hours
  setInterval(() => {
    sendReminders().catch((err) =>
      console.error("[Reminders] Error en ciclo diario:", err)
    );
  }, INTERVAL_MS);

  console.log("[Reminders] Servicio de recordatorios de suscripción iniciado.");
}
