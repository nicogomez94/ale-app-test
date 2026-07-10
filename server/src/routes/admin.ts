import { Router, Response } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { runJobsNow } from "../lib/subscriptionReminders.js";
import { getWeekStartForBuenosAires } from "../lib/weeklySummary.js";
import { getPlanConfigurations, serializePlanConfiguration } from "../lib/planCatalog.js";

export const adminRouter = Router();

const DEFAULT_TRIAL_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Admin guard middleware
async function adminGuard(req: AuthRequest, res: Response, next: () => void) {
  if (!req.userId) {
    res.status(401).json({ error: "No autorizado" });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) {
    res.status(403).json({ error: "Acceso denegado — se requieren permisos de administrador" });
    return;
  }
  next();
}

// All admin routes require auth + admin
adminRouter.use(authMiddleware, adminGuard);

adminRouter.get("/plans", async (_req: AuthRequest, res: Response) => {
  try {
    const plans = await getPlanConfigurations();
    res.json(plans.map(serializePlanConfiguration));
  } catch (error) {
    console.error("Admin plans list error:", error);
    res.status(500).json({ error: "No se pudieron cargar los planes" });
  }
});

adminRouter.put("/plans/:plan", async (req: AuthRequest, res: Response) => {
  try {
    const plan = String(req.params.plan || "").toUpperCase();
    if (!["EMPRENDEDOR", "PROFESIONAL", "AGENCIA"].includes(plan)) {
      res.status(400).json({ error: "Plan no soportado" });
      return;
    }

    const name = String(req.body?.name || "").trim();
    const monthlyPrice = Number(req.body?.monthlyPrice);
    const features = Array.isArray(req.body?.features)
      ? req.body.features.map((item: unknown) => String(item).trim()).filter(Boolean)
      : [];

    if (name.length < 2 || name.length > 50) {
      res.status(400).json({ error: "El nombre debe tener entre 2 y 50 caracteres" });
      return;
    }
    if (!Number.isFinite(monthlyPrice) || monthlyPrice <= 0 || monthlyPrice > 100_000_000) {
      res.status(400).json({ error: "Ingresá un precio mensual válido" });
      return;
    }
    if (features.length === 0 || features.length > 20) {
      res.status(400).json({ error: "Ingresá entre 1 y 20 características" });
      return;
    }

    const updated = await prisma.planConfiguration.update({
      where: { plan: plan as "EMPRENDEDOR" | "PROFESIONAL" | "AGENCIA" },
      data: {
        name,
        monthlyPrice: Math.round(monthlyPrice * 100) / 100,
        isVisible: Boolean(req.body?.isVisible),
        annualEnabled: Boolean(req.body?.annualEnabled),
        annualDiscountMonths: 2,
        features,
      },
    });

    res.json(serializePlanConfiguration(updated));
  } catch (error) {
    console.error("Admin plan update error:", error);
    res.status(500).json({ error: "No se pudo actualizar el plan" });
  }
});

// GET /api/admin/stats — platform-wide stats
adminRouter.get("/stats", async (req: AuthRequest, res: Response) => {
  try {
    const [totalUsuarios, usuarios, totalPolizas, totalClientes, totalEmpresas] = await Promise.all([
      prisma.user.count(),
      prisma.user.findMany({ select: { plan: true, estado: true } }),
      prisma.policy.count(),
      prisma.client.count(),
      prisma.company.count(),
    ]);

    const activos = usuarios.filter((u) => u.estado === "ACTIVO").length;
    const porPlan: Record<string, number> = {};
    for (const u of usuarios) {
      porPlan[u.plan] = (porPlan[u.plan] || 0) + 1;
    }

    res.json({
      totalUsuarios,
      activos,
      inactivos: totalUsuarios - activos,
      porPlan,
      totalPolizas,
      totalClientes,
      totalEmpresas,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});

// GET /api/admin/weekly-summaries — global audit for Stage C
adminRouter.get("/weekly-summaries", async (_req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const weekStart = getWeekStartForBuenosAires(now);
    const windowEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const [pasUsers, expiringPolicies, dispatches, recent] = await Promise.all([
      prisma.user.findMany({
        where: { isAdmin: false, estado: "ACTIVO" },
        select: { id: true, telefono: true },
      }),
      prisma.policy.findMany({
        where: {
          user: { isAdmin: false, estado: "ACTIVO" },
          fechaVencimiento: { gte: now, lte: windowEnd },
        },
        select: { userId: true },
      }),
      prisma.weeklySummaryDispatch.findMany({ where: { weekStart }, select: { status: true } }),
      prisma.weeklySummaryDispatch.findMany({
        include: {
          user: { select: { nombre: true, email: true } },
          messages: { select: { status: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);
    const usersWithExpirations = new Set(expiringPolicies.map((policy) => policy.userId));
    const byStatus = dispatches.reduce<Record<string, number>>((acc, dispatch) => {
      acc[dispatch.status] = (acc[dispatch.status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      weekStart,
      totalPas: pasUsers.length,
      pasWithValidPhone: pasUsers.filter((user) => Boolean(user.telefono?.trim())).length,
      policiesExpiring: expiringPolicies.length,
      pasWithoutExpirations: pasUsers.filter((user) => !usersWithExpirations.has(user.id)).length,
      dispatches: dispatches.length,
      byStatus,
      recent: recent.map((dispatch) => ({
        id: dispatch.id,
        pasName: dispatch.user.nombre,
        pasEmail: dispatch.user.email,
        recipient: dispatch.recipient,
        weekStart: dispatch.weekStart,
        policyCount: dispatch.policyCount,
        totalChunks: dispatch.totalChunks,
        status: dispatch.status,
        attemptCount: dispatch.attemptCount,
        sentAt: dispatch.sentAt,
        errorMessage: dispatch.errorMessage,
        createdAt: dispatch.createdAt,
        messageStatuses: dispatch.messages.map((message) => message.status),
      })),
    });
  } catch (error) {
    console.error("Admin weekly summaries error:", error);
    res.status(500).json({ error: "No se pudo auditar el resumen semanal" });
  }
});

// GET /api/admin/users — list all users with counts
adminRouter.get("/users", async (req: AuthRequest, res: Response) => {
  try {
    const search = (req.query.search as string) || "";
    const where = search
      ? {
          OR: [
            { nombre: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        nombre: true,
        plan: true,
        estado: true,
        isAdmin: true,
        isTestUser: true,
        planVencimiento: true,
        trialFin: true,
        lastLogin: true,
        createdAt: true,
        _count: {
          select: {
            polizas: true,
            clientes: true,
            empresas: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(users);
  } catch (error) {
    console.error("Admin users list error:", error);
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// PUT /api/admin/users/:id — update user plan/status
adminRouter.put("/users/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { plan, estado, isTestUser, trialDays, trialMode } = req.body as {
      plan?: string;
      estado?: string;
      isTestUser?: boolean;
      trialDays?: unknown;
      trialMode?: "set" | "extend";
    };

    const data: Record<string, unknown> = {};
    if (plan) data.plan = plan;
    if (estado) data.estado = estado;
    if (typeof isTestUser === "boolean") data.isTestUser = isTestUser;

    if (trialDays !== undefined) {
      const days = Number(trialDays);
      if (!Number.isInteger(days) || days < 1 || days > 365) {
        res.status(400).json({ error: "Los días de prueba deben ser un número entero entre 1 y 365" });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: { plan: true, trialFin: true },
      });

      if (!user) {
        res.status(404).json({ error: "Usuario no encontrado" });
        return;
      }

      const targetPlan = plan || user.plan;
      if (targetPlan !== "TRIAL") {
        res.status(400).json({ error: "Solo se puede modificar el período de prueba en usuarios con plan Trial" });
        return;
      }

      const now = new Date();
      const baseDate = trialMode === "extend" && user.trialFin && user.trialFin > now ? user.trialFin : now;
      const trialFin = new Date(baseDate.getTime() + days * MS_PER_DAY);
      data.plan = "TRIAL";
      data.trialFin = trialFin;
      data.planVencimiento = trialFin;
      data.estado = "ACTIVO";
    }

    // If changing to a paid plan, set planVencimiento to 30 days from now
    if (plan && plan !== "TRIAL") {
      data.planVencimiento = new Date(Date.now() + DEFAULT_TRIAL_DAYS * MS_PER_DAY);
    } else if (plan === "TRIAL" && trialDays === undefined) {
      const trialFin = new Date(Date.now() + DEFAULT_TRIAL_DAYS * MS_PER_DAY);
      data.trialFin = trialFin;
      data.planVencimiento = trialFin;
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        nombre: true,
        plan: true,
        estado: true,
        isTestUser: true,
        planVencimiento: true,
        trialFin: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error("Admin update user error:", error);
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// DELETE /api/admin/users/:id — delete user and all their data (cascade)
adminRouter.delete("/users/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (id === req.userId) {
      res.status(400).json({ error: "No podés eliminar tu propia cuenta" });
      return;
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Admin delete user error:", error);
    res.status(500).json({ error: "Error al eliminar usuario" });
  }
});

// POST /api/admin/run-jobs — manually trigger all periodic jobs (only for test users)
adminRouter.post("/run-jobs", async (_req: AuthRequest, res: Response) => {
  try {
    console.log("[Admin] Disparo manual de jobs periódicos (solo usuarios de prueba)...");
    const results = await runJobsNow(true);
    res.json({ message: "Jobs ejecutados (solo usuarios de prueba)", results });
  } catch (error) {
    console.error("Admin run-jobs error:", error);
    res.status(500).json({ error: "Error ejecutando jobs" });
  }
});

// POST /api/admin/test-seed
// Body: { userId, scenario: "expiring_1d" | "expiring_3d" | "expired" | "day1_referrals" | "policy_vencida" | "policy_cleanup" | "policy_vence_pronto" }
adminRouter.post("/test-seed", async (req: AuthRequest, res: Response) => {
  try {
    const { userId, scenario } = req.body as { userId: string; scenario: string };
    if (!userId || !scenario) {
      res.status(400).json({ error: "userId y scenario son requeridos" });
      return;
    }

    const now = new Date();

    switch (scenario) {
      case "expiring_1d": {
        const t = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000 - 60_000);
        await prisma.user.update({ where: { id: userId }, data: { planVencimiento: t, trialFin: t, estado: "ACTIVO" } });
        res.json({ message: "planVencimiento y trialFin seteados a 1 día", value: t });
        break;
      }
      case "expiring_3d": {
        const t = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 - 60_000);
        await prisma.user.update({ where: { id: userId }, data: { planVencimiento: t, trialFin: t, estado: "ACTIVO" } });
        res.json({ message: "planVencimiento y trialFin seteados a 3 días", value: t });
        break;
      }
      case "expired": {
        const t = new Date(now.getTime() - 60_000);
        await prisma.user.update({ where: { id: userId }, data: { planVencimiento: t, trialFin: t } });
        res.json({ message: "planVencimiento y trialFin seteados en el pasado (expirado)", value: t });
        break;
      }
      case "day1_referrals": {
        await prisma.user.update({ where: { id: userId }, data: { referidosMes: 5 } });
        res.json({ message: "referidosMes seteado a 5 — corré test-seed luego en el día 1 real o combinalo con run-jobs" });
        break;
      }
      case "policy_vencida": {
        const policies = await prisma.policy.findMany({ where: { userId }, select: { id: true, fechaInicio: true, fechaVencimiento: true } });
        for (const p of policies) {
          const duration = p.fechaVencimiento.getTime() - p.fechaInicio.getTime();
          const fechaVencimiento = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          await prisma.policy.update({
            where: { id: p.id },
            data: {
              fechaInicio: new Date(fechaVencimiento.getTime() - duration),
              fechaVencimiento,
              recordatorioProximoEnviadoAt: null,
              recordatorioVencidaEnviadoAt: null,
            },
          });
        }
        res.json({ message: `${policies.length} póliza(s) vencidas hace 30 días` });
        break;
      }
      case "policy_cleanup": {
        const policies = await prisma.policy.findMany({ where: { userId }, select: { id: true, fechaInicio: true, fechaVencimiento: true } });
        for (const p of policies) {
          const duration = p.fechaVencimiento.getTime() - p.fechaInicio.getTime();
          const fechaVencimiento = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          await prisma.policy.update({
            where: { id: p.id },
            data: {
              fechaInicio: new Date(fechaVencimiento.getTime() - duration),
              fechaVencimiento,
              recordatorioProximoEnviadoAt: null,
              recordatorioVencidaEnviadoAt: null,
            },
          });
        }
        res.json({ message: `${policies.length} póliza(s) preparadas para limpieza a 60 días` });
        break;
      }
      case "policy_vence_pronto": {
        const policies = await prisma.policy.findMany({ where: { userId }, select: { id: true } });
        const newVenc = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        for (const p of policies) {
          await prisma.policy.update({
            where: { id: p.id },
            data: {
              fechaVencimiento: newVenc,
              recordatorioProximoEnviadoAt: null,
              recordatorioVencidaEnviadoAt: null,
            },
          });
        }
        res.json({ message: `${policies.length} póliza(s) seteadas para vencer en 3 días`, value: newVenc });
        break;
      }
      default:
        res.status(400).json({ error: `Escenario desconocido: ${scenario}` });
    }
  } catch (error) {
    console.error("Admin test-seed error:", error);
    res.status(500).json({ error: "Error aplicando escenario de test" });
  }
});
