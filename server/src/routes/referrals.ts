import { Router, Response } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";

export const referralsRouter = Router();
referralsRouter.use(authMiddleware);

// Get referral status
referralsRouter.get("/status", async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        referralCode: true,
        referidosMes: true,
        referidosTotales: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    // Referral benefits calculation
    let descuento = 0;
    let proximoObjetivo = 1;
    let proximoBeneficio = "10% de descuento";

    if (user.referidosMes >= 10) {
      descuento = 100;
      proximoObjetivo = 10;
      proximoBeneficio = "Mes 100% bonificado";
    } else if (user.referidosMes >= 5) {
      descuento = 50;
      proximoObjetivo = 10;
      proximoBeneficio = "Mes 100% bonificado";
    } else if (user.referidosMes >= 1) {
      descuento = 10;
      proximoObjetivo = 5;
      proximoBeneficio = "50% de descuento";
    }

    const progreso = Math.min((user.referidosMes / proximoObjetivo) * 100, 100);

    res.json({
      referralCode: user.referralCode,
      referidosMes: user.referidosMes,
      referidosTotales: user.referidosTotales,
      descuento,
      proximoObjetivo,
      proximoBeneficio,
      progreso: Math.round(progreso),
      faltan: Math.max(0, proximoObjetivo - user.referidosMes),
    });
  } catch (error) {
    console.error("Referral status error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Apply referral code (during registration - public endpoint handled at auth level)
// This is for tracking referral share actions
referralsRouter.post("/track-share", async (req: AuthRequest, res: Response) => {
  try {
    const { method } = req.body; // whatsapp, email, copy
    // Could log share events for analytics
    res.json({ message: "Compartido correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});
