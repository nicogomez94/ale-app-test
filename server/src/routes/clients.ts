import { Router, Response } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { checkPlanLimit } from "../middleware/planLimits.js";
import * as XLSX from "xlsx";

export const clientsRouter = Router();
clientsRouter.use(authMiddleware);

// List clients
clientsRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query;
    const where: any = { userId: req.userId };

    if (search) {
      where.OR = [
        { nombre: { contains: search as string, mode: "insensitive" } },
        { dni: { contains: search as string } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        polizas: {
          where: { estado: { in: ["ACTIVA", "VENCE_PRONTO"] } },
          orderBy: { fechaVencimiento: "asc" },
          select: {
            id: true,
            aseguradora: true,
            rubro: true,
            numeroPoliza: true,
            fechaVencimiento: true,
            estado: true,
            cuotaActual: true,
            cuotaTotal: true,
          },
        },
      },
    });

    const dnis = clients.map((client) => client.dni).filter(Boolean);
    const lifeOr: any[] = [];
    if (dnis.length) lifeOr.push({ cuit: { in: dnis } });
    clients.forEach((client) => {
      if (client.nombre) {
        lifeOr.push({ cliente: { equals: client.nombre, mode: "insensitive" } });
      }
    });

    const lifePolicies = lifeOr.length
      ? await prisma.lifePolicy.findMany({
          where: { userId: req.userId, OR: lifeOr },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            cliente: true,
            cuit: true,
            aseguradora: true,
            tipo: true,
            sumaAsegurada: true,
            prima: true,
            aporteMensual: true,
            fondoAcumulado: true,
          },
        })
      : [];

    const lifeByCuit = new Map<string, typeof lifePolicies>();
    const lifeByName = new Map<string, typeof lifePolicies>();
    lifePolicies.forEach((policy) => {
      if (policy.cuit) lifeByCuit.set(policy.cuit, [...(lifeByCuit.get(policy.cuit) || []), policy]);
      if (policy.cliente) {
        const key = policy.cliente.trim().toLowerCase();
        lifeByName.set(key, [...(lifeByName.get(key) || []), policy]);
      }
    });

    res.json(clients.map((client) => ({
      ...client,
      polizasActivas: client.polizas,
      vidaRetiroActivas: [
        ...(lifeByCuit.get(client.dni) || []),
        ...(lifeByName.get(client.nombre.trim().toLowerCase()) || []),
      ].filter((policy, index, all) => all.findIndex((item) => item.id === policy.id) === index),
    })));
  } catch (error) {
    console.error("List clients error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Create client
clientsRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, dni, telefono, email, direccion, altura, cp, provincia, localidad } = req.body;

    if (!nombre || !dni || !telefono || !email) {
      res.status(400).json({ error: "Nombre, DNI, teléfono y email son requeridos" });
      return;
    }

    const limitCheck = await checkPlanLimit(req.userId!, "clientes");
    if (!limitCheck.allowed) {
      res.status(403).json({ error: limitCheck.message });
      return;
    }

    const client = await prisma.client.create({
      data: {
        userId: req.userId!,
        nombre,
        dni,
        telefono,
        email,
        direccion,
        altura,
        cp,
        provincia,
        localidad,
      },
    });

    res.status(201).json(client);
  } catch (error) {
    console.error("Create client error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Update client
clientsRouter.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, dni, telefono, email, direccion, altura, cp, provincia, localidad } = req.body;

    const existing = await prisma.client.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Cliente no encontrado" });
      return;
    }

    const client = await prisma.client.update({
      where: { id },
      data: { nombre, dni, telefono, email, direccion, altura, cp, provincia, localidad },
    });

    res.json(client);
  } catch (error) {
    console.error("Update client error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Delete client
clientsRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.client.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Cliente no encontrado" });
      return;
    }

    await prisma.client.delete({ where: { id } });
    res.json({ message: "Cliente eliminado" });
  } catch (error) {
    console.error("Delete client error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Export to Excel
clientsRouter.get("/export", async (req: AuthRequest, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      where: { userId: req.userId },
      orderBy: { nombre: "asc" },
      select: {
        nombre: true,
        dni: true,
        telefono: true,
        email: true,
        direccion: true,
        altura: true,
        cp: true,
        localidad: true,
        provincia: true,
      },
    });

    const ws = XLSX.utils.json_to_sheet(clients);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=Clientes_PAS_Alert.xlsx");
    res.send(buffer);
  } catch (error) {
    console.error("Export clients error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});
