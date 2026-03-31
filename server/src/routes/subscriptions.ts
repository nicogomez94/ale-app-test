import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { createPreference } from "../lib/mercadopago.js";

export const subscriptionsRouter = Router();

// Create MercadoPago preference (requires auth)
subscriptionsRouter.post("/create-preference", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { planName, price } = req.body;

    if (!planName || !price) {
      res.status(400).json({ error: "Plan y precio son requeridos" });
      return;
    }

    const result = await createPreference(req.userId!, planName, price);
    res.json({ id: result.id, init_point: result.init_point });
  } catch (error) {
    console.error("Error creating MP preference:", error);
    res.status(500).json({ error: "Error al crear preferencia de pago" });
  }
});

// MercadoPago Webhook (no auth - called by MP)
subscriptionsRouter.post("/webhook", async (req: Request, res: Response) => {
  try {
    const { query } = req;
    const topic = query.topic || query.type;

    console.log("MP Webhook received:", topic, req.body);

    // In production:
    // 1. Verify the payment with MP API
    // 2. Extract external_reference (userId)
    // 3. Update user plan, subscription dates
    // 4. Record the payment in Payment table

    const { data } = req.body;
    if (data?.id) {
      // TODO: Verify payment with MercadoPago API
      // const payment = await new Payment(client).get({ id: data.id });
      // Update user:
      // await prisma.user.update({ where: { id: externalReference }, data: { plan, planVencimiento, estado: "ACTIVO" } });
      // Record payment:
      // await prisma.payment.create({ ... });
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(200).send("OK"); // Always return 200 to MP
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
