import { Router, Response } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";

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
    const { plan, estado } = req.body;

    const data: Record<string, unknown> = {};
    if (plan) data.plan = plan;
    if (estado) data.estado = estado;

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
