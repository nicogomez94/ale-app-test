import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { createPreference, getPaymentById } from "../lib/mercadopago.js";

export const subscriptionsRouter = Router();

const KNOWN_PLANS = {
  EMPRENDEDOR: { monthly: 6900, annual: 69000 },
  PROFESIONAL: { monthly: 14900, annual: 149000 },
  AGENCIA: { monthly: 39900, annual: 399000 },
} as const;

type PlanKey = keyof typeof KNOWN_PLANS;
type BillingCycle = "monthly" | "annual";

function normalizePlanKey(value?: string): PlanKey {
  const v = (value || "").toUpperCase();
  if (v === "EMPRENDEDOR" || v.includes("STARTER")) return "EMPRENDEDOR";
  if (v === "PROFESIONAL" || v.includes("PROFESIONAL") || v.includes("PRO+")) return "PROFESIONAL";
  if (v === "AGENCIA") return "AGENCIA";
  return "EMPRENDEDOR";
}

function normalizeBillingCycle(value?: string): BillingCycle {
  const v = (value || "").toLowerCase();
  if (v.includes("annual") || v.includes("anual")) return "annual";
  return "monthly";
}

function inferPlanFromAmount(amount?: number): { plan: PlanKey; billingCycle: BillingCycle } {
  const paid = Number(amount || 0);
  for (const [plan, prices] of Object.entries(KNOWN_PLANS) as [PlanKey, { monthly: number; annual: number }][]) {
    if (Math.abs(paid - prices.annual) <= 1) return { plan, billingCycle: "annual" };
    if (Math.abs(paid - prices.monthly) <= 1) return { plan, billingCycle: "monthly" };
  }
  return { plan: "EMPRENDEDOR", billingCycle: "monthly" };
}

async function applyApprovedPayment(paymentRaw: any, fallbackUserId?: string) {
  const payment = paymentRaw as any;
  const paymentId = String(payment.id);
  const userId = String(payment.external_reference || fallbackUserId || "");
  if (!userId) throw new Error("Pago sin external_reference (userId)");

  const status = String(payment.status || "");
  if (status !== "approved") {
    return { applied: false, status };
  }

  const existing = await prisma.payment.findFirst({
    where: { userId, mpPaymentId: paymentId },
    select: { id: true },
  });
  if (existing) {
    return { applied: false, status: "already_processed" };
  }

  const amount = Number(payment.transaction_amount || 0);
  const metadata = (payment.metadata || {}) as {
    planKey?: string;
    billingCycle?: string;
    planName?: string;
  };

  const titleFromItem = payment.additional_info?.items?.[0]?.title as string | undefined;
  const inferredFromAmount = inferPlanFromAmount(amount);
  const plan = normalizePlanKey(metadata.planKey || metadata.planName || titleFromItem);
  const billingCycle = normalizeBillingCycle(metadata.billingCycle || metadata.planName || titleFromItem) || inferredFromAmount.billingCycle;
  const months = billingCycle === "annual" ? 12 : 1;
  const now = new Date();
  const fin = new Date(now);
  fin.setMonth(fin.getMonth() + months);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        estado: "ACTIVO",
        planVencimiento: fin,
      },
    }),
    prisma.subscription.create({
      data: {
        userId,
        plan,
        precio: amount,
        inicio: now,
        fin,
        estado: "activo",
        mpPaymentId: paymentId,
      },
    }),
    prisma.payment.create({
      data: {
        userId,
        monto: amount,
        plan,
        metodoPago: payment.payment_method_id || null,
        mpPaymentId: paymentId,
        estado: status,
      },
    }),
  ]);

  return {
    applied: true,
    status,
    plan,
    billingCycle,
    planVencimiento: fin,
  };
}

// Create MercadoPago preference (requires auth)
subscriptionsRouter.post("/create-preference", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { planName, price, planKey, billingCycle } = req.body;

    if (!planName || !price) {
      res.status(400).json({ error: "Plan y precio son requeridos" });
      return;
    }

    const result = await createPreference(req.userId!, planName, price, planKey, billingCycle);
    res.json({ id: result.id, init_point: result.init_point });
  } catch (error) {
    console.error("Error creating MP preference:", error);
    const mpError = error as { status?: number; code?: string; message?: string };
    if (mpError?.status === 401 || mpError?.status === 403) {
      res.status(502).json({
        error: "Error de configuración de Mercado Pago",
        details: mpError.message || "Token sin permisos o inválido",
      });
      return;
    }

    res.status(500).json({ error: mpError?.message || "Error al crear preferencia de pago" });
  }
});

// MercadoPago Webhook (no auth - called by MP)
subscriptionsRouter.post("/webhook", async (req: Request, res: Response) => {
  try {
    const dataId = req.body?.data?.id || req.query["data.id"] || req.query.id;
    if (dataId) {
      const payment = await getPaymentById(String(dataId));
      await applyApprovedPayment(payment);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(200).send("OK"); // Always return 200 to MP
  }
});

// Confirm payment on return URL (useful in local dev without public webhook)
subscriptionsRouter.post("/confirm", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const paymentId = req.body?.paymentId || req.body?.payment_id;
    if (!paymentId) {
      res.status(400).json({ error: "paymentId es requerido" });
      return;
    }

    const payment = await getPaymentById(String(paymentId));
    const externalReference = String((payment as any).external_reference || "");
    if (externalReference && externalReference !== req.userId) {
      res.status(403).json({ error: "Pago no corresponde al usuario autenticado" });
      return;
    }

    const result = await applyApprovedPayment(payment, req.userId);
    res.json(result);
  } catch (error) {
    console.error("Confirm payment error:", error);
    const msg = (error as Error)?.message || "No se pudo confirmar el pago";
    res.status(500).json({ error: msg });
  }
});

// Get current subscription (requires auth)
subscriptionsRouter.get("/current", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        plan: true,
        planVencimiento: true,
        trialFin: true,
        estado: true,
        createdAt: true,
      },
    });

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
    });
  } catch (error) {
    console.error("Current subscription error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Get payment history (requires auth)
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
