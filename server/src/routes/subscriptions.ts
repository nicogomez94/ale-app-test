import { Router, Request, Response } from "express";
import crypto from "crypto";
import { BillingCycle, PlanType } from "../../node_modules/.prisma/client/default.js";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import {
  cancelPreapproval,
  createPreapprovalPlan,
  createPreapprovalSubscription,
  getAuthorizedPaymentById,
  getPaymentById,
  getPreapprovalById,
  searchPreapprovalPlans,
  searchPreapprovals,
} from "../lib/mercadopago.js";

export const subscriptionsRouter = Router();

const KNOWN_PLANS = {
  EMPRENDEDOR: {
    plan: PlanType.EMPRENDEDOR,
    label: "Starter",
    monthlyPrice: 6900,
  },
  PROFESIONAL: {
    plan: PlanType.PROFESIONAL,
    label: "Profesional",
    monthlyPrice: 14900,
  },
  AGENCIA: {
    plan: PlanType.AGENCIA,
    label: "Agencia",
    monthlyPrice: 39900,
  },
} as const;

type PlanKey = keyof typeof KNOWN_PLANS;

function getHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function parseSignatureHeader(signatureHeader: string) {
  const parts = signatureHeader.split(",");
  let ts = "";
  let v1 = "";

  for (const part of parts) {
    const [rawKey, rawValue] = part.split("=");
    const key = rawKey?.trim();
    const value = rawValue?.trim();
    if (key === "ts") ts = value || "";
    if (key === "v1") v1 = value || "";
  }

  return { ts, v1 };
}

function validateWebhookSignature(req: Request): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET?.trim();
  if (!secret) return true;

  const signatureHeader = getHeaderValue(req.headers["x-signature"]);
  const requestIdHeader = getHeaderValue(req.headers["x-request-id"]);
  if (!signatureHeader || !requestIdHeader) return false;

  const { ts, v1 } = parseSignatureHeader(signatureHeader);
  if (!ts || !v1) return false;

  const dataId = String(req.body?.data?.id || req.query["data.id"] || req.query.id || "").toLowerCase();
  if (!dataId) return false;

  const manifest = `id:${dataId};request-id:${requestIdHeader};ts:${ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}

function getPlanDefinition(planKey?: string) {
  if (!planKey) return null;
  const normalized = planKey.toUpperCase() as PlanKey;
  return KNOWN_PLANS[normalized] || null;
}

function normalizeProviderStatus(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  return normalized === "cancelled" ? "canceled" : normalized;
}

function getPlanReason(planKey: PlanKey): string {
  return `PAS Alert - ${KNOWN_PLANS[planKey].label} Mensual`;
}

function parseOptionalDate(value?: string | number | Date | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function inferPlanKeyFromAmount(amount?: number | null): PlanKey | null {
  const paid = Number(amount || 0);
  for (const [planKey, plan] of Object.entries(KNOWN_PLANS) as [PlanKey, (typeof KNOWN_PLANS)[PlanKey]][]) {
    if (Math.abs(paid - plan.monthlyPrice) <= 1) return planKey;
  }
  return null;
}

function inferPlanKeyFromText(value?: string | null): PlanKey | null {
  const normalized = (value || "").toUpperCase();
  if (normalized.includes("STARTER") || normalized.includes("EMPRENDEDOR")) return "EMPRENDEDOR";
  if (normalized.includes("PROFESIONAL")) return "PROFESIONAL";
  if (normalized.includes("AGENCIA")) return "AGENCIA";
  return null;
}

function isCancelableStatus(status?: string | null): boolean {
  const normalized = normalizeProviderStatus(status);
  return normalized === "pending" || normalized === "authorized" || normalized === "paused";
}

function getSubscriptionState(status?: string | null): string {
  switch (normalizeProviderStatus(status)) {
    case "authorized":
      return "activa";
    case "paused":
      return "pausada";
    case "canceled":
      return "cancelada";
    case "pending":
    default:
      return "pendiente";
  }
}

function getLatestAccessDate(user: { planVencimiento: Date | null; trialFin: Date | null }, now: Date): Date {
  if (user.planVencimiento && user.planVencimiento > now) return new Date(user.planVencimiento);
  if (user.trialFin && user.trialFin > now) return new Date(user.trialFin);
  return now;
}

async function ensureProviderPlan(planKey: PlanKey) {
  const definition = KNOWN_PLANS[planKey];
  const existing = await prisma.subscriptionProviderPlan.findUnique({
    where: {
      plan_billingCycle: {
        plan: definition.plan,
        billingCycle: BillingCycle.MONTHLY,
      },
    },
  });

  if (existing) return existing;

  const reason = getPlanReason(planKey);
  const remoteSearch = await searchPreapprovalPlans(reason);
  const matchingRemotePlan = remoteSearch.results?.find((item: any) => (
    item.reason === reason &&
    normalizeProviderStatus(item.status) !== "canceled" &&
    Number(item.auto_recurring?.transaction_amount || 0) === definition.monthlyPrice &&
    Number(item.auto_recurring?.frequency || 0) === 1 &&
    item.auto_recurring?.frequency_type === "months"
  ));

  const remotePlan = matchingRemotePlan || await createPreapprovalPlan({
    reason,
    frequency: 1,
    frequencyType: "months",
    transactionAmount: definition.monthlyPrice,
    currencyId: "ARS",
  });

  if (!remotePlan.id) {
    throw new Error("Mercado Pago no devolvió el id del plan recurrente");
  }

  return prisma.subscriptionProviderPlan.create({
    data: {
      plan: definition.plan,
      billingCycle: BillingCycle.MONTHLY,
      price: definition.monthlyPrice,
      reason,
      status: normalizeProviderStatus(remotePlan.status) || "active",
      mpPreapprovalPlanId: String(remotePlan.id),
    },
  });
}

async function findLatestLocalRecurringSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: {
      userId,
      mpPreapprovalId: { not: null },
    },
    orderBy: [
      { createdAt: "desc" },
      { updatedAt: "desc" },
    ],
  });
}

async function findRemoteSubscriptionForUser(userId: string, payerEmail?: string | null) {
  if (!payerEmail) return null;
  const result = await searchPreapprovals({ payerEmail });
  const matches = (result.results || []).filter((item: any) => String(item.external_reference || "") === userId);
  matches.sort((a: any, b: any) => {
    const aDate = parseOptionalDate(a.last_modified || a.date_created)?.getTime() || 0;
    const bDate = parseOptionalDate(b.last_modified || b.date_created)?.getTime() || 0;
    return bDate - aDate;
  });
  return matches[0] || null;
}

async function syncSubscriptionFromRemote(preapprovalRaw: any) {
  const preapproval = preapprovalRaw as any;
  const mpPreapprovalId = String(preapproval.id || "");
  const userId = String(preapproval.external_reference || "");

  if (!mpPreapprovalId || !userId) {
    return null;
  }

  const providerStatus = normalizeProviderStatus(preapproval.status) || "pending";
  const mpPreapprovalPlanId = String(preapproval.preapproval_plan_id || "");

  let providerPlan = mpPreapprovalPlanId
    ? await prisma.subscriptionProviderPlan.findUnique({
        where: { mpPreapprovalPlanId },
      })
    : null;

  if (!providerPlan) {
    const inferredPlanKey =
      inferPlanKeyFromText(preapproval.reason) ||
      inferPlanKeyFromAmount(preapproval.auto_recurring?.transaction_amount);
    if (inferredPlanKey) {
      providerPlan = await ensureProviderPlan(inferredPlanKey);
    }
  }

  if (!providerPlan) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      planVencimiento: true,
      trialFin: true,
    },
  });

  if (!user) {
    return null;
  }

  const existing = await prisma.subscription.findUnique({
    where: { mpPreapprovalId },
  });

  const now = new Date();
  const currentAccessEnd = existing?.fin || getLatestAccessDate(user, now);

  return prisma.subscription.upsert({
    where: { mpPreapprovalId },
    update: {
      plan: providerPlan.plan,
      billingCycle: providerPlan.billingCycle,
      precio: Number(preapproval.auto_recurring?.transaction_amount || providerPlan.price),
      fin: currentAccessEnd,
      estado: getSubscriptionState(providerStatus),
      providerStatus,
      mpPreapprovalPlanId: providerPlan.mpPreapprovalPlanId,
      nextPaymentDate: parseOptionalDate(preapproval.next_payment_date),
      cancelledAt: providerStatus === "canceled" ? new Date() : null,
    },
    create: {
      userId,
      plan: providerPlan.plan,
      billingCycle: providerPlan.billingCycle,
      precio: Number(preapproval.auto_recurring?.transaction_amount || providerPlan.price),
      inicio: now,
      fin: currentAccessEnd,
      estado: getSubscriptionState(providerStatus),
      providerStatus,
      mpPreapprovalId,
      mpPreapprovalPlanId: providerPlan.mpPreapprovalPlanId,
      nextPaymentDate: parseOptionalDate(preapproval.next_payment_date),
      cancelledAt: providerStatus === "canceled" ? new Date() : null,
    },
  });
}

async function resolveSubscriptionForPayment(userId: string, planKey: PlanKey, payerEmail?: string | null) {
  const local = await prisma.subscription.findFirst({
    where: {
      userId,
      plan: KNOWN_PLANS[planKey].plan,
      billingCycle: BillingCycle.MONTHLY,
      mpPreapprovalId: { not: null },
    },
    orderBy: [
      { createdAt: "desc" },
      { updatedAt: "desc" },
    ],
  });

  if (local) return local;

  const remote = await findRemoteSubscriptionForUser(userId, payerEmail);
  if (!remote) return null;

  return syncSubscriptionFromRemote(remote);
}

async function applyApprovedRecurringPayment(paymentRaw: any) {
  const payment = paymentRaw as any;
  const mpPaymentId = String(payment.id || "");
  const userId = String(payment.external_reference || "");

  if (!mpPaymentId || !userId) {
    return { applied: false, status: "ignored" };
  }

  const paymentStatus = normalizeProviderStatus(payment.status);
  if (paymentStatus !== "approved") {
    return { applied: false, status: paymentStatus || "ignored" };
  }

  const existingPayment = await prisma.payment.findFirst({
    where: { mpPaymentId },
    select: { id: true },
  });
  if (existingPayment) {
    return { applied: false, status: "already_processed" };
  }

  const planKey = inferPlanKeyFromAmount(payment.transaction_amount);
  if (!planKey) {
    return { applied: false, status: "ignored_unknown_amount" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      planVencimiento: true,
      trialFin: true,
    },
  });

  if (!user) {
    throw new Error("Usuario no encontrado para registrar el cobro recurrente");
  }

  const subscription = await resolveSubscriptionForPayment(userId, planKey, payment.payer?.email);
  const now = new Date();
  const baseDate = getLatestAccessDate(user, now);
  const nextAccessEnd = addMonths(baseDate, 1);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        plan: KNOWN_PLANS[planKey].plan,
        estado: "ACTIVO",
        planVencimiento: nextAccessEnd,
      },
    }),
    prisma.payment.create({
      data: {
        userId,
        monto: Number(payment.transaction_amount || KNOWN_PLANS[planKey].monthlyPrice),
        plan: KNOWN_PLANS[planKey].plan,
        metodoPago: payment.payment_method_id || null,
        mpPaymentId,
        mpPreapprovalId: subscription?.mpPreapprovalId || null,
        estado: paymentStatus,
      },
    }),
    ...(subscription ? [
      prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          plan: KNOWN_PLANS[planKey].plan,
          billingCycle: BillingCycle.MONTHLY,
          precio: Number(payment.transaction_amount || KNOWN_PLANS[planKey].monthlyPrice),
          fin: nextAccessEnd,
          estado: getSubscriptionState(subscription.providerStatus),
        },
      }),
    ] : []),
  ]);

  return {
    applied: true,
    status: paymentStatus,
    plan: KNOWN_PLANS[planKey].plan,
    planVencimiento: nextAccessEnd,
  };
}

function normalizeAuthorizedPayment(raw: any) {
  return {
    id: raw?.id,
    status: raw?.status,
    external_reference: raw?.external_reference,
    transaction_amount: raw?.transaction_amount,
    payment_method_id: raw?.payment_method_id,
    payer: raw?.payer,
  };
}

subscriptionsRouter.post("/create-preapproval", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const planKey = String(req.body?.planKey || "").toUpperCase() as PlanKey;
    const definition = getPlanDefinition(planKey);

    if (!definition) {
      res.status(400).json({ error: "Plan no soportado" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        planVencimiento: true,
        trialFin: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    const currentSubscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        mpPreapprovalId: { not: null },
        providerStatus: {
          notIn: ["canceled", "cancelled"],
        },
      },
      orderBy: [
        { createdAt: "desc" },
        { updatedAt: "desc" },
      ],
    });

    if (currentSubscription) {
      res.status(409).json({ error: "Ya existe una suscripción recurrente en curso para este usuario" });
      return;
    }

    const providerPlan = await ensureProviderPlan(planKey);
    const preapproval = await createPreapprovalSubscription({
      preapprovalPlanId: providerPlan.mpPreapprovalPlanId,
      payerEmail: user.email,
      externalReference: user.id,
      reason: providerPlan.reason,
    });

    if (!preapproval.id || !preapproval.init_point) {
      throw new Error("Mercado Pago no devolvió el checkout de la suscripción");
    }

    const now = new Date();
    const accessEnd = getLatestAccessDate(user, now);
    const localSubscription = await prisma.subscription.upsert({
      where: { mpPreapprovalId: String(preapproval.id) },
      update: {
        plan: definition.plan,
        billingCycle: BillingCycle.MONTHLY,
        precio: providerPlan.price,
        fin: accessEnd,
        estado: getSubscriptionState(preapproval.status),
        providerStatus: normalizeProviderStatus(preapproval.status),
        mpPreapprovalPlanId: providerPlan.mpPreapprovalPlanId,
        nextPaymentDate: parseOptionalDate(preapproval.next_payment_date),
        cancelledAt: null,
      },
      create: {
        userId: user.id,
        plan: definition.plan,
        billingCycle: BillingCycle.MONTHLY,
        precio: providerPlan.price,
        inicio: now,
        fin: accessEnd,
        estado: getSubscriptionState(preapproval.status),
        providerStatus: normalizeProviderStatus(preapproval.status),
        mpPreapprovalId: String(preapproval.id),
        mpPreapprovalPlanId: providerPlan.mpPreapprovalPlanId,
        nextPaymentDate: parseOptionalDate(preapproval.next_payment_date),
      },
    });

    res.json({
      init_point: preapproval.init_point,
      subscriptionId: localSubscription.id,
      providerStatus: normalizeProviderStatus(preapproval.status),
    });
  } catch (error) {
    console.error("Error creating MP preapproval:", error);
    const mpError = error as { status?: number; message?: string };
    if (mpError?.status === 401 || mpError?.status === 403) {
      res.status(502).json({
        error: "Error de configuración de Mercado Pago",
        details: mpError.message || "Token sin permisos o inválido",
      });
      return;
    }

    res.status(500).json({ error: mpError?.message || "No se pudo iniciar la suscripción" });
  }
});

subscriptionsRouter.post("/cancel", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.userId,
        mpPreapprovalId: { not: null },
        providerStatus: {
          notIn: ["canceled", "cancelled"],
        },
      },
      orderBy: [
        { createdAt: "desc" },
        { updatedAt: "desc" },
      ],
    });

    if (!subscription?.mpPreapprovalId) {
      res.status(404).json({ error: "No hay una suscripción recurrente activa para cancelar" });
      return;
    }

    const remote = await cancelPreapproval(subscription.mpPreapprovalId);
    const updatedSubscription = await syncSubscriptionFromRemote({
      ...remote,
      id: remote.id || subscription.mpPreapprovalId,
      external_reference: req.userId,
      preapproval_plan_id: remote.preapproval_plan_id || subscription.mpPreapprovalPlanId,
    });

    res.json({
      message: "La renovación automática fue cancelada. El acceso se mantiene hasta el fin del período pago.",
      providerStatus: normalizeProviderStatus(remote.status) || "canceled",
      planVencimiento: updatedSubscription?.fin || subscription.fin,
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    res.status(500).json({ error: (error as Error)?.message || "No se pudo cancelar la suscripción" });
  }
});

subscriptionsRouter.post("/webhook", async (req: Request, res: Response) => {
  try {
    if (!validateWebhookSignature(req)) {
      res.status(401).send("invalid signature");
      return;
    }

    const topic = String(req.body?.type || req.query.type || req.query.topic || "").toLowerCase();
    const dataId = String(req.body?.data?.id || req.query["data.id"] || req.query.id || "");

    if (!dataId) {
      res.status(200).send("OK");
      return;
    }

    if (topic === "payment") {
      const payment = await getPaymentById(dataId);
      await applyApprovedRecurringPayment(payment);
      res.status(200).send("OK");
      return;
    }

    if (topic === "subscription_authorized_payment") {
      const authorizedPayment = await getAuthorizedPaymentById(dataId);
      await applyApprovedRecurringPayment(normalizeAuthorizedPayment(authorizedPayment));
      res.status(200).send("OK");
      return;
    }

    if (topic === "subscription_preapproval" || topic === "subscription") {
      const preapproval = await getPreapprovalById(dataId);
      await syncSubscriptionFromRemote(preapproval);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(200).send("OK");
  }
});

subscriptionsRouter.get("/current", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const [user, subscription] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          plan: true,
          planVencimiento: true,
          trialFin: true,
          estado: true,
          createdAt: true,
        },
      }),
      findLatestLocalRecurringSubscription(req.userId!),
    ]);

    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    const now = new Date();
    const vencimiento = user.planVencimiento || user.trialFin;
    const diasRestantes = vencimiento
      ? Math.max(0, Math.ceil((vencimiento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const mostrarAviso = diasRestantes <= 5 && diasRestantes > 0;
    const accesoBloqueado = vencimiento ? now > vencimiento : false;

    res.json({
      plan: user.plan,
      planVencimiento: vencimiento,
      vencimiento,
      diasRestantes,
      estado: user.estado,
      mostrarAviso,
      accesoBloqueado,
      billingCycle: subscription?.billingCycle || null,
      providerStatus: normalizeProviderStatus(subscription?.providerStatus),
      nextPaymentDate: subscription?.nextPaymentDate || null,
      cancelledAt: subscription?.cancelledAt || null,
      canCancel: !!subscription?.mpPreapprovalId && isCancelableStatus(subscription.providerStatus),
    });
  } catch (error) {
    console.error("Current subscription error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

subscriptionsRouter.get("/payments", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
    });

    res.json(payments);
  } catch (error) {
    console.error("Payment history error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});
