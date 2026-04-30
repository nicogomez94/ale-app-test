import { Router, Response } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { runJobsNow } from "../lib/subscriptionReminders.js";

export const adminRouter = Router();

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
    const { plan, estado, isTestUser } = req.body;

    const data: Record<string, unknown> = {};
    if (plan) data.plan = plan;
    if (estado) data.estado = estado;
    if (typeof isTestUser === "boolean") data.isTestUser = isTestUser;

    // If changing to a paid plan, set planVencimiento to 30 days from now
    if (plan && plan !== "TRIAL") {
      data.planVencimiento = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
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
        planVencimiento: true,
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
// Body: { userId, scenario: "expiring_1d" | "expiring_3d" | "expired" | "day1_referrals" | "policy_vencida" | "policy_vence_pronto" }
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
        const shift = 400 * 24 * 60 * 60 * 1000;
        for (const p of policies) {
          await prisma.policy.update({
            where: { id: p.id },
            data: {
              fechaInicio: new Date(p.fechaInicio.getTime() - shift),
              fechaVencimiento: new Date(p.fechaVencimiento.getTime() - shift),
            },
          });
        }
        res.json({ message: `${policies.length} póliza(s) movidas 400 días al pasado` });
        break;
      }
      case "policy_vence_pronto": {
        const policies = await prisma.policy.findMany({ where: { userId }, select: { id: true } });
        const newVenc = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        for (const p of policies) {
          await prisma.policy.update({ where: { id: p.id }, data: { fechaVencimiento: newVenc } });
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
