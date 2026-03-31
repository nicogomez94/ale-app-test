import { Router, Response } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import * as XLSX from "xlsx";

export const commissionsRouter = Router();
commissionsRouter.use(authMiddleware);

// Get commissions summary for current month
commissionsRouter.get("/summary", async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Active policies with commission data
    const policies = await prisma.policy.findMany({
      where: {
        userId: req.userId,
        estado: { not: "VENCIDA" },
      },
    });

    const totalPrima = policies.reduce((sum: number, p: any) => sum + p.prima, 0);
    const totalComision = policies.reduce((sum: number, p: any) => sum + p.comisionCalculada, 0);
    const avgComision = policies.length > 0 ? totalComision / policies.length : 0;

    // Commission by rubro
    const byRubro: Record<string, number> = {};
    for (const p of policies) {
      const key = p.rubro || "Otros";
      byRubro[key] = (byRubro[key] || 0) + p.comisionCalculada;
    }

    const distribucion = Object.entries(byRubro).map(([name, value]) => ({
      name,
      value: Math.round(value),
    }));

    res.json({
      comisionProyectada: Math.round(totalComision),
      totalPrima: Math.round(totalPrima),
      promedioPoliza: Math.round(avgComision),
      totalPolizas: policies.length,
      distribucion,
    });
  } catch (error) {
    console.error("Commissions summary error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Get monthly history
commissionsRouter.get("/monthly", async (req: AuthRequest, res: Response) => {
  try {
    const closes = await prisma.commissionClose.findMany({
      where: { userId: req.userId },
      orderBy: [{ anio: "asc" }, { mes: "asc" }],
    });

    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    const monthly = closes.map((c: any) => ({
      id: c.id,
      name: meses[c.mes - 1],
      mes: c.mes,
      anio: c.anio,
      totalPrima: c.totalPrima,
      comision: c.comisionBruta,
      crecimiento: c.crecimiento,
    }));

    res.json(monthly);
  } catch (error) {
    console.error("Monthly commissions error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Close month (cierre mensual)
commissionsRouter.post("/close", async (req: AuthRequest, res: Response) => {
  try {
    const { mes, anio } = req.body;

    if (!mes || !anio) {
      res.status(400).json({ error: "Mes y año son requeridos" });
      return;
    }

    // Check if already closed
    const existing = await prisma.commissionClose.findUnique({
      where: {
        userId_mes_anio: {
          userId: req.userId!,
          mes: parseInt(mes),
          anio: parseInt(anio),
        },
      },
    });

    if (existing) {
      res.status(409).json({ error: "Este mes ya fue cerrado" });
      return;
    }

    // Calculate from active policies
    const policies = await prisma.policy.findMany({
      where: {
        userId: req.userId,
        estado: { not: "VENCIDA" },
      },
    });

    const totalPrima = policies.reduce((sum: number, p: any) => sum + p.prima, 0);
    const comisionBruta = policies.reduce((sum: number, p: any) => sum + p.comisionCalculada, 0);

    // Get previous month's close for growth calculation
    let crecimiento: number | null = null;
    const prevMonth = parseInt(mes) === 1 ? 12 : parseInt(mes) - 1;
    const prevYear = parseInt(mes) === 1 ? parseInt(anio) - 1 : parseInt(anio);

    const prevClose = await prisma.commissionClose.findUnique({
      where: {
        userId_mes_anio: {
          userId: req.userId!,
          mes: prevMonth,
          anio: prevYear,
        },
      },
    });

    if (prevClose && prevClose.comisionBruta > 0) {
      crecimiento = ((comisionBruta - prevClose.comisionBruta) / prevClose.comisionBruta) * 100;
    }

    const close = await prisma.commissionClose.create({
      data: {
        userId: req.userId!,
        mes: parseInt(mes),
        anio: parseInt(anio),
        totalPrima,
        comisionBruta,
        crecimiento,
      },
    });

    res.status(201).json(close);
  } catch (error) {
    console.error("Close commission error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Export commissions to Excel
commissionsRouter.get("/export", async (req: AuthRequest, res: Response) => {
  try {
    const closes = await prisma.commissionClose.findMany({
      where: { userId: req.userId },
      orderBy: [{ anio: "desc" }, { mes: "desc" }],
    });

    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    const data = closes.map((c: any) => ({
      Mes: `${meses[c.mes - 1]} ${c.anio}`,
      "Total Prima": c.totalPrima,
      "Comisión Bruta": c.comisionBruta,
      "Crecimiento %": c.crecimiento != null ? `${c.crecimiento.toFixed(1)}%` : "-",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comisiones");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=Comisiones_PAS_Alert.xlsx");
    res.send(buffer);
  } catch (error) {
    console.error("Export commissions error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});
