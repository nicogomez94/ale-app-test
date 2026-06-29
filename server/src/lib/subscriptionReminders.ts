import prisma from "./prisma.js";
import { sendEmail } from "./email.js";
import { cleanupOrphanCouponFiles, deleteCouponPdf } from "./couponStorage.js";
import { getExpiredPolicyGroups } from "./policyCleanup.js";

const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDaysRemaining(target: Date, now: Date): number {
  const targetDay = startOfDay(target).getTime();
  const currentDay = startOfDay(now).getTime();
  return Math.round((targetDay - currentDay) / (1000 * 60 * 60 * 24));
}

// ─── Policy status update ────────────────────────────────────────────────────

async function updatePolicyStatuses(onlyTestUsers = false): Promise<void> {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let userIdFilter: { userId?: { in: string[] } } = {};
  if (onlyTestUsers) {
    const testUsers = await prisma.user.findMany({ where: { isTestUser: true }, select: { id: true } });
    userIdFilter = { userId: { in: testUsers.map((u) => u.id) } };
  }

  const [vencidas, vencenPronto, activas] = await prisma.$transaction([
    prisma.policy.updateMany({
      where: { ...userIdFilter, fechaVencimiento: { lt: now }, estado: { not: "VENCIDA" } },
      data: { estado: "VENCIDA" },
    }),
    prisma.policy.updateMany({
      where: { ...userIdFilter, fechaVencimiento: { gte: now, lte: in7Days }, estado: { not: "VENCE_PRONTO" } },
      data: { estado: "VENCE_PRONTO" },
    }),
    prisma.policy.updateMany({
      where: { ...userIdFilter, fechaVencimiento: { gt: in7Days }, estado: { not: "ACTIVA" } },
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

async function deleteExpiredPolicyGroups(onlyTestUsers = false): Promise<void> {
  const policies = await prisma.policy.findMany({
    where: onlyTestUsers ? { user: { isTestUser: true } } : undefined,
    select: { id: true, userId: true, groupId: true, fechaVencimiento: true },
  });
  const expiredGroups = getExpiredPolicyGroups(policies);
  let deletedPolicies = 0;
  let deletedCoupons = 0;

  for (const group of expiredGroups) {
    const coupon = await prisma.policyCoupon.findUnique({
      where: { userId_policyGroupId: { userId: group.userId, policyGroupId: group.policyGroupId } },
    });
    const deleted = await prisma.$transaction(async (tx) => {
      if (coupon) await tx.policyCoupon.delete({ where: { id: coupon.id } });
      return tx.policy.deleteMany({ where: { id: { in: group.memberIds }, userId: group.userId } });
    });
    deletedPolicies += deleted.count;
    if (coupon) {
      deletedCoupons++;
      await deleteCouponPdf(coupon.storageKey);
    }
  }

  const activeCoupons = await prisma.policyCoupon.findMany({ select: { storageKey: true } });
  const orphanFiles = await cleanupOrphanCouponFiles(new Set(activeCoupons.map((coupon) => coupon.storageKey)));
  console.log(
    `[PolicyCleanup] ${deletedPolicies} póliza(s), ${deletedCoupons} cuponera(s) y ${orphanFiles} archivo(s) huérfano(s) eliminados.`
  );
}

async function sendPolicyExpirationReminders(onlyTestUsers = false): Promise<void> {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const policies = await prisma.policy.findMany({
    where: {
      clienteEmail: { not: null },
      user: {
        estado: "ACTIVO",
        ...(onlyTestUsers ? { isTestUser: true } : {}),
      },
      fechaVencimiento: { lte: in7Days },
    },
    select: {
      id: true,
      clienteNombre: true,
      clienteEmail: true,
      numeroPoliza: true,
      aseguradora: true,
      fechaVencimiento: true,
      recordatorioProximoEnviadoAt: true,
      recordatorioVencidaEnviadoAt: true,
      user: {
        select: {
          nombre: true,
          email: true,
        },
      },
    },
    orderBy: { fechaVencimiento: "asc" },
  });

  let sentSoon = 0;
  let sentExpired = 0;

  for (const policy of policies) {
    const recipient = (policy.clienteEmail || "").trim();
    if (!recipient) continue;

    const daysRemaining = getDaysRemaining(policy.fechaVencimiento, now);
    const producerName = policy.user.nombre;
    const producerEmail = policy.user.email;

    if (daysRemaining >= 0 && daysRemaining <= 7 && !policy.recordatorioProximoEnviadoAt) {
      const dueText =
        daysRemaining === 0
          ? "vence hoy"
          : daysRemaining === 1
            ? "vence mañana"
            : `vence en ${daysRemaining} dias`;

      const message =
        `Hola ${policy.clienteNombre},\n\n` +
        `Te recordamos que tu poliza N° ${policy.numeroPoliza} con ${policy.aseguradora} ${dueText}.\n\n` +
        `Si queres gestionarla o renovarla, podes responder este correo o contactar a ${producerName}.\n\n` +
        `Saludos,\n${producerName}\nPAS Alert`;

      try {
        await sendEmail({
          name: producerName,
          email: producerEmail,
          to: recipient,
          message,
        });

        await prisma.policy.update({
          where: { id: policy.id },
          data: { recordatorioProximoEnviadoAt: new Date() },
        });

        sentSoon++;
        console.log(`[PolicyReminders] Recordatorio proximo enviado a ${recipient} (${policy.numeroPoliza})`);
      } catch (err) {
        console.error(`[PolicyReminders] Error enviando recordatorio proximo a ${recipient}:`, err);
      }

      continue;
    }

    if (daysRemaining < 0 && !policy.recordatorioVencidaEnviadoAt) {
      const message =
        `Hola ${policy.clienteNombre},\n\n` +
        `Te informamos que tu poliza N° ${policy.numeroPoliza} con ${policy.aseguradora} ya se encuentra vencida.\n\n` +
        `Por favor, contactate con ${producerName} para revisar la renovacion.\n\n` +
        `Saludos,\n${producerName}\nPAS Alert`;

      try {
        await sendEmail({
          name: producerName,
          email: producerEmail,
          to: recipient,
          message,
        });

        await prisma.policy.update({
          where: { id: policy.id },
          data: { recordatorioVencidaEnviadoAt: new Date() },
        });

        sentExpired++;
        console.log(`[PolicyReminders] Recordatorio de vencida enviado a ${recipient} (${policy.numeroPoliza})`);
      } catch (err) {
        console.error(`[PolicyReminders] Error enviando recordatorio de vencida a ${recipient}:`, err);
      }
    }
  }

  if (sentSoon === 0 && sentExpired === 0) {
    console.log("[PolicyReminders] Sin recordatorios automaticos de polizas para enviar hoy.");
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

async function sendReminders(onlyTestUsers = false): Promise<void> {
  const now = new Date();
  const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

  // Find users whose access expires within the next 5 days (trial and paid)
  const users = await prisma.user.findMany({
    where: {
      ...(onlyTestUsers ? { isTestUser: true } : {}),
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
  await deleteExpiredPolicyGroups().catch((err) => console.error("[PolicyCleanup] Error:", err));
  await sendPolicyExpirationReminders().catch((err) => console.error("[PolicyReminders] Error:", err));
  await resetMonthlyReferrals().catch((err) => console.error("[ReferralJob] Error:", err));
  await sendReminders().catch((err) => console.error("[Reminders] Error:", err));
}

// Exported for manual trigger (admin endpoint / testing)
// onlyTestUsers=true: only affects users with isTestUser=true (used from admin panel)
export async function runJobsNow(onlyTestUsers = false): Promise<{ policies: string; policyCleanup: string; policyReminders: string; referrals: string; reminders: string }> {
  const results = { policies: "ok", policyCleanup: "ok", policyReminders: "ok", referrals: "ok", reminders: "ok" };

  await updatePolicyStatuses(onlyTestUsers).catch((err) => {
    console.error("[PolicyJob] Error:", err);
    results.policies = String(err?.message || err);
  });

  await deleteExpiredPolicyGroups(onlyTestUsers).catch((err) => {
    console.error("[PolicyCleanup] Error:", err);
    results.policyCleanup = String(err?.message || err);
  });

  await sendPolicyExpirationReminders(onlyTestUsers).catch((err) => {
    console.error("[PolicyReminders] Error:", err);
    results.policyReminders = String(err?.message || err);
  });

  await resetMonthlyReferrals().catch((err) => {
    console.error("[ReferralJob] Error:", err);
    results.referrals = String(err?.message || err);
  });

  await sendReminders(onlyTestUsers).catch((err) => {
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

  console.log("[Jobs] Servicios periódicos iniciados: estados, limpieza de pólizas, referidos y recordatorios.");
}
