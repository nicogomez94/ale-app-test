import { Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "./auth.js";

export async function subscriptionGuard(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { plan: true, planVencimiento: true, trialFin: true, estado: true },
  });

  if (!user) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }

  const now = new Date();
  const vencimiento = user.planVencimiento || user.trialFin;
  const expirado = vencimiento ? now > vencimiento : false;

  if (expirado || user.estado === "INACTIVO") {
    res.status(403).json({
      error: "subscription_expired",
      message: "Tu suscripción ha vencido. Renová tu plan para continuar.",
    });
    return;
  }

  next();
}
