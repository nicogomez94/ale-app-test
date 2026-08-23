import { Router, Response } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { checkPlanLimit } from "../middleware/planLimits.js";
import * as XLSX from "xlsx";

export const clientsRouter = Router();
clientsRouter.use(authMiddleware);

function parseBirthDate(value: unknown): Date | null {
  if (!value) return null;
  const raw = String(value).trim();
  const display = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const year = Number(display?.[3] || iso?.[1]);
  const month = Number(display?.[2] || iso?.[2]);
  const day = Number(display?.[1] || iso?.[3]);
  if (!year || !month || !day) return null;
  const parsed = new Date(Date.UTC(year, month - 1, day, 12));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function nextBirthday(fechaNacimiento: Date, now = new Date()) {
  const next = new Date(now.getFullYear(), fechaNacimiento.getUTCMonth(), fechaNacimiento.getUTCDate(), 12);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0);
  if (next < start) next.setFullYear(next.getFullYear() + 1);
  const daysUntil = Math.ceil((next.getTime() - start.getTime()) / 86_400_000);
  return { next, daysUntil, age: next.getFullYear() - fechaNacimiento.getUTCFullYear() };
}

clientsRouter.get("/birthdays", async (req: AuthRequest, res: Response) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days || 7), 1), 31);
    const clients = await prisma.client.findMany({
      where: { userId: req.userId, fechaNacimiento: { not: null } },
      orderBy: { nombre: "asc" },
    });
    const birthdays = clients.flatMap((client) => {
      if (!client.fechaNacimiento) return [];
      const info = nextBirthday(client.fechaNacimiento);
      if (info.daysUntil > days) return [];
      return [{
        id: client.id,
        nombre: client.nombre,
        telefono: client.telefono,
        fechaNacimiento: client.fechaNacimiento.toISOString().split("T")[0],
        proximoCumpleanos: info.next.toISOString().split("T")[0],
        diasRestantes: info.daysUntil,
        edad: info.age,
      }];
    }).sort((a, b) => a.diasRestantes - b.diasRestantes || a.nombre.localeCompare(b.nombre));
    res.json(birthdays);
  } catch (error) {
    console.error("Birthdays error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// List clients
clientsRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { search, provincia, localidad } = req.query;
    const where: any = { userId: req.userId };

    if (search) {
      where.OR = [
        { nombre: { contains: search as string, mode: "insensitive" } },
        { dni: { contains: search as string } },
      ];
    }
    if (provincia) where.provincia = provincia as string;
    if (localidad) where.localidad = { contains: localidad as string, mode: "insensitive" };

    const clients = await prisma.client.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        polizas: {
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
            fechaInicio: true,
            medioPago: true,
            vigencia: true,
            pagada: true,
            fechaPago: true,
            prima: true,
            ultimaGestionTipo: true,
            ultimaGestionFecha: true,
            ultimaGestionWhatsappCount: true,
            ultimaGestionMailCount: true,
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
      fechaNacimiento: client.fechaNacimiento?.toISOString().split("T")[0] || null,
      polizasActivas: client.polizas.filter((policy) => ["ACTIVA", "VENCE_PRONTO"].includes(policy.estado)),
      polizas: client.polizas.map((policy) => ({
        ...policy,
        fechaInicio: policy.fechaInicio.toISOString().split("T")[0],
        fechaVencimiento: policy.fechaVencimiento.toISOString().split("T")[0],
        fechaPago: policy.fechaPago?.toISOString().split("T")[0] || null,
        ultimaGestionFecha: policy.ultimaGestionFecha?.toISOString().split("T")[0] || null,
      })),
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
    const { nombre, dni, telefono, email, direccion, altura, cp, provincia, localidad, fechaNacimiento } = req.body;

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
        fechaNacimiento: parseBirthDate(fechaNacimiento),
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
    const { nombre, dni, telefono, email, direccion, altura, cp, provincia, localidad, fechaNacimiento } = req.body;

    const existing = await prisma.client.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Cliente no encontrado" });
      return;
    }

    const client = await prisma.client.update({
      where: { id },
      data: { nombre, dni, telefono, email, direccion, altura, cp, provincia, localidad, fechaNacimiento: parseBirthDate(fechaNacimiento) },
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
        fechaNacimiento: true,
      },
    });

    const ws = XLSX.utils.json_to_sheet(clients.map((client) => ({
      ...client,
      fechaNacimiento: client.fechaNacimiento?.toISOString().split("T")[0] || "",
    })));
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
