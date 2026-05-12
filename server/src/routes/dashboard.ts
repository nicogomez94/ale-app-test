import { Router, Response } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { getVigenciaLabel } from "../lib/generalPolicies.js";

export const dashboardRouter = Router();
dashboardRouter.use(authMiddleware);

const dashboardPolicyInclude = {
  cliente: {
    select: {
      id: true,
      nombre: true,
      dni: true,
      telefono: true,
      email: true,
      direccion: true,
      altura: true,
      cp: true,
      provincia: true,
      localidad: true,
    },
  },
  company: {
    select: {
      id: true,
      razonSocial: true,
      cuit: true,
      telefono: true,
      email: true,
      direccion: true,
      altura: true,
      cp: true,
      provincia: true,
      localidad: true,
      tipo: true,
    },
  },
} as const;

// Get dashboard stats
dashboardRouter.get("/stats", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const [totalPolicies, activePolicies, expiredPolicies, totalClients, totalCompanies] = await Promise.all([
      prisma.policy.count({ where: { userId } }),
      prisma.policy.count({ where: { userId, estado: "ACTIVA" } }),
      prisma.policy.count({ where: { userId, estado: "VENCIDA" } }),
      prisma.client.count({ where: { userId } }),
      prisma.company.count({ where: { userId } }),
    ]);

    // Policies expiring in 7 days
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const expiringCount = await prisma.policy.count({
      where: {
        userId,
        estado: "VENCE_PRONTO",
      },
    });

    res.json({
      polizasActivas: activePolicies,
      vencen7Dias: expiringCount,
      polizasVencidas: expiredPolicies,
      clientesTotales: totalClients + totalCompanies,
      totalPolizas: totalPolicies,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Get recent policies for dashboard tables
dashboardRouter.get("/policies", async (req: AuthRequest, res: Response) => {
  try {
    const { filter, rubro, limit } = req.query;
    const where: any = { userId: req.userId };
    const parsedLimit = Number(limit);
    const take = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;

    if (filter === "expiring") {
      where.estado = "VENCE_PRONTO";
    } else if (filter === "expired") {
      where.estado = "VENCIDA";
    } else if (filter === "active") {
      where.estado = "ACTIVA";
    }

    if (rubro) {
      where.rubro = rubro as string;
    }

    const policies = await prisma.policy.findMany({
      where,
      orderBy: { fechaVencimiento: "asc" },
      ...(take ? { take } : {}),
      include: dashboardPolicyInclude,
    });

    // Map to frontend format
    const mapped = policies.map((p: any) => {
      const daysLeft = Math.ceil(
        (p.fechaVencimiento.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      let estadoLabel = "Activa";
      if (daysLeft < 0) estadoLabel = "Vencida";
      else if (daysLeft <= 7) estadoLabel = "Vence pronto";

      return {
        id: p.id,
        clienteId: p.clienteId,
        companyId: p.companyId,
        cliente: p.company?.razonSocial || p.clienteNombre,
        clienteNombre: p.clienteNombre,
        clienteDni: p.clienteDni || p.cliente?.dni || p.company?.cuit || "",
        clienteTelefono: p.clienteTelefono || p.cliente?.telefono || p.company?.telefono || "",
        clienteEmail: p.clienteEmail || p.cliente?.email || p.company?.email || "",
        aseguradora: p.aseguradora,
        rubro: p.rubro,
        inicio: p.fechaInicio.toISOString().split("T")[0],
        vencimiento: p.fechaVencimiento.toISOString().split("T")[0],
        poliza: p.numeroPoliza,
        estado: p.estado,
        estadoLabel,
        tipo: p.tipo,
        medioPago: p.medioPago,
        diasRestantes: daysLeft,
        telefono: p.clienteTelefono || p.cliente?.telefono || p.company?.telefono || "",
        email: p.clienteEmail || p.cliente?.email || p.company?.email || "",
        direccion: p.cliente?.direccion || p.company?.direccion || "",
        altura: p.cliente?.altura || p.company?.altura || "",
        cp: p.cliente?.cp || p.company?.cp || "",
        provincia: p.cliente?.provincia || p.company?.provincia || "",
        localidad: p.cliente?.localidad || p.company?.localidad || "",
        vigencia: p.vigencia,
        vigenciaLabel: getVigenciaLabel(p.vigencia),
        cuotaActual: p.cuotaActual,
        cuotaTotal: p.cuotaTotal,
        cuota: `${p.cuotaActual}/${p.cuotaTotal}`,
        groupId: p.groupId || p.id,
        pagada: p.pagada,
        fechaPago: p.fechaPago ? p.fechaPago.toISOString().split("T")[0] : "",
        prima: p.prima,
        porcentajeComision: p.porcentajeComision,
        comisionCalculada: p.comisionCalculada,
        ultimaGestion:
          p.ultimaGestionTipo && p.ultimaGestionFecha
            ? {
                tipo: p.ultimaGestionTipo,
                fecha: p.ultimaGestionFecha.toISOString().split("T")[0],
                whatsappCount: p.ultimaGestionWhatsappCount,
                mailCount: p.ultimaGestionMailCount,
              }
            : null,
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error("Dashboard policies error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Get alerts
dashboardRouter.get("/alerts", async (req: AuthRequest, res: Response) => {
  try {
    // Get upcoming expirations and recently expired policies as alerts
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const expiringPolicies = await prisma.policy.findMany({
      where: {
        userId: req.userId,
        estado: "VENCE_PRONTO",
      },
      orderBy: { fechaVencimiento: "asc" },
      take: 5,
    });

    const expiredPolicies = await prisma.policy.findMany({
      where: {
        userId: req.userId,
        estado: "VENCIDA",
      },
      orderBy: { fechaVencimiento: "desc" },
      take: 3,
    });

    const alerts: Array<{ id: string; type: string; message: string; date: string }> = [];

    for (const p of expiringPolicies) {
      const daysLeft = Math.ceil(
        (p.fechaVencimiento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      alerts.push({
        id: p.id,
        type: "warning",
        message: `La póliza #${p.numeroPoliza} de ${p.clienteNombre} vence en ${daysLeft} días.`,
        date: p.fechaVencimiento.toISOString(),
      });
    }

    for (const p of expiredPolicies) {
      alerts.push({
        id: p.id,
        type: "error",
        message: `Póliza #${p.numeroPoliza} de ${p.clienteNombre} ha vencido.`,
        date: p.fechaVencimiento.toISOString(),
      });
    }

    // Get referral info for alert
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { referidosMes: true },
    });

    if (user && user.referidosMes > 0) {
      alerts.push({
        id: "referral",
        type: "info",
        message: `Tienes ${user.referidosMes} referido(s) este mes. ¡Sigue así!`,
        date: now.toISOString(),
      });
    }

    res.json(alerts);
  } catch (error) {
    console.error("Dashboard alerts error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});
