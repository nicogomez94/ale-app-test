import prisma from "./prisma.js";
import { sendEmail } from "./email.js";

const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Policy status update ────────────────────────────────────────────────────

async function updatePolicyStatuses(): Promise<void> {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [vencidas, vencenPronto, activas] = await prisma.$transaction([
    prisma.policy.updateMany({
      where: { fechaVencimiento: { lt: now }, estado: { not: "VENCIDA" } },
      data: { estado: "VENCIDA" },
    }),
    prisma.policy.updateMany({
      where: { fechaVencimiento: { gte: now, lte: in7Days }, estado: { not: "VENCE_PRONTO" } },
      data: { estado: "VENCE_PRONTO" },
    }),
    prisma.policy.updateMany({
      where: { fechaVencimiento: { gt: in7Days }, estado: { not: "ACTIVA" } },
      data: { estado: "ACTIVA" },
    }),
  ]);

  const total = vencidas.count + vencenPronto.count + activas.count;
  if (total > 0) {
    console.log(
      `[PolicyJob] ${total} pólizas actualizadas — VENCIDA: ${vencidas.count}, VENCE_PRONTO: ${vencenPronto.count}, ACTIVA: ${activas.count}`
    );
  } else {
    console.log("[PolicyJob] Sin cambios de estado en pólizas.");
  }
}

// ─── Monthly referral reset ──────────────────────────────────────────────────

async function resetMonthlyReferrals(): Promise<void> {
  const now = new Date();
  if (now.getDate() !== 1) return; // only runs on the 1st of each month

  const result = await prisma.user.updateMany({
    where: { referidosMes: { gt: 0 } },
    data: { referidosMes: 0 },
  });

  console.log(`[ReferralJob] Reset mensual: ${result.count} usuario(s) reiniciados.`);
}

// ─── Subscription reminders ──────────────────────────────────────────────────

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

async function runAllJobs(): Promise<void> {
  await updatePolicyStatuses().catch((err) => console.error("[PolicyJob] Error:", err));
  await resetMonthlyReferrals().catch((err) => console.error("[ReferralJob] Error:", err));
  await sendReminders().catch((err) => console.error("[Reminders] Error:", err));
}

// Exported for manual trigger (admin endpoint / testing)
export async function runJobsNow(): Promise<{ policies: string; referrals: string; reminders: string }> {
  const results = { policies: "ok", referrals: "ok", reminders: "ok" };

  await updatePolicyStatuses().catch((err) => {
    console.error("[PolicyJob] Error:", err);
    results.policies = String(err?.message || err);
  });

  await resetMonthlyReferrals().catch((err) => {
    console.error("[ReferralJob] Error:", err);
    results.referrals = String(err?.message || err);
  });

  await sendReminders().catch((err) => {
    console.error("[Reminders] Error:", err);
    results.reminders = String(err?.message || err);
  });

  return results;
}

export function startSubscriptionReminders(): void {
  // Run once at startup after a short delay to let the server settle
  setTimeout(() => {
    runAllJobs().catch((err) => console.error("[Jobs] Error en ciclo inicial:", err));
  }, 10_000);

  // Then run every 24 hours
  setInterval(() => {
    runAllJobs().catch((err) => console.error("[Jobs] Error en ciclo diario:", err));
  }, INTERVAL_MS);

  console.log("[Jobs] Servicios periódicos iniciados: estados de pólizas, referidos y recordatorios.");
}
