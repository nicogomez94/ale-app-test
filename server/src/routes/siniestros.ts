import { Router, Response } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import * as XLSX from "xlsx";

export const siniestrosRouter = Router();
siniestrosRouter.use(authMiddleware);

// ─── Priority calculation ─────────────────────────────────────────────────────
function calcularPrioridad(
  importeReclamado: number | null | undefined,
  updatedAt: Date
): "ALTA" | "MEDIA" | "BAJA" {
  const diasSinUpdate = Math.floor(
    (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const importe = importeReclamado ?? 0;

  if (importe > 500000 || diasSinUpdate > 10) return "ALTA";
  if (importe > 100000 || diasSinUpdate > 5) return "MEDIA";
  return "BAJA";
}

function parseOptionalFloat(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalDate(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return new Date(String(value));
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim()) ?? null;
}

async function agregarContactoClientes<T extends { numeroPoliza: string; clienteNombre: string; clienteDni?: string | null }>(
  siniestros: T[],
  userId: string
) {
  const polizas = Array.from(
    new Set(siniestros.map((s) => s.numeroPoliza.trim()).filter(Boolean))
  );
  const dnis = Array.from(new Set(siniestros.map((s) => s.clienteDni).filter(Boolean))) as string[];
  const nombres = Array.from(
    new Set(siniestros.map((s) => s.clienteNombre.trim()).filter(Boolean))
  );

  const or: any[] = [];
  if (dnis.length) or.push({ dni: { in: dnis } });
  nombres.forEach((nombre) => {
    or.push({ nombre: { equals: nombre, mode: "insensitive" } });
  });

  const policyOr: any[] = [];
  if (polizas.length) policyOr.push({ numeroPoliza: { in: polizas } });
  if (dnis.length) policyOr.push({ clienteDni: { in: dnis } });
  nombres.forEach((nombre) => {
    policyOr.push({ clienteNombre: { equals: nombre, mode: "insensitive" } });
  });

  const [clientes, policies] = await Promise.all([
    or.length
      ? prisma.client.findMany({
          where: { userId, OR: or },
          select: { nombre: true, dni: true, telefono: true, email: true },
        })
      : Promise.resolve([]),
    policyOr.length
      ? prisma.policy.findMany({
          where: { userId, OR: policyOr },
          select: {
            numeroPoliza: true,
            clienteNombre: true,
            clienteDni: true,
            clienteTelefono: true,
            clienteEmail: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const porDni = new Map(clientes.map((cliente) => [cliente.dni, cliente]));
  const porNombre = new Map(
    clientes.map((cliente) => [cliente.nombre.trim().toLowerCase(), cliente])
  );
  const policyPorPoliza = new Map(policies.map((policy) => [policy.numeroPoliza, policy]));
  const policyPorDni = new Map(
    policies
      .filter((policy) => policy.clienteDni)
      .map((policy) => [policy.clienteDni!, policy])
  );
  const policyPorNombre = new Map(
    policies.map((policy) => [policy.clienteNombre.trim().toLowerCase(), policy])
  );

  return siniestros.map((siniestro) => {
    const cliente =
      (siniestro.clienteDni ? porDni.get(siniestro.clienteDni) : undefined) ??
      porNombre.get(siniestro.clienteNombre.trim().toLowerCase());
    const policy =
      policyPorPoliza.get(siniestro.numeroPoliza) ??
      (siniestro.clienteDni ? policyPorDni.get(siniestro.clienteDni) : undefined) ??
      policyPorNombre.get(siniestro.clienteNombre.trim().toLowerCase());

    return {
      ...siniestro,
      clienteTelefono: firstNonEmpty(cliente?.telefono, policy?.clienteTelefono),
      clienteEmail: firstNonEmpty(cliente?.email, policy?.clienteEmail),
    };
  });
}

// ─── List siniestros ──────────────────────────────────────────────────────────
siniestrosRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { estado, prioridad, search } = req.query;

    const where: any = { userId: req.userId };

    if (estado) where.estado = estado as string;
    if (search) {
      where.OR = [
        { numeroSiniestro: { contains: search as string, mode: "insensitive" } },
        { clienteNombre: { contains: search as string, mode: "insensitive" } },
        { aseguradora: { contains: search as string, mode: "insensitive" } },
        { numeroPoliza: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const siniestros = await prisma.siniestro.findMany({
      where,
      include: { notas: { orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
    });

    // Recalculate priority on the fly
    const result = siniestros.map((s) => ({
      ...s,
      prioridad: calcularPrioridad(s.importeReclamado, s.updatedAt),
    })).filter((s) => !prioridad || s.prioridad === prioridad);

    res.json(await agregarContactoClientes(result, req.userId!));
  } catch (error) {
    console.error("List siniestros error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ─── KPIs ─────────────────────────────────────────────────────────────────────
siniestrosRouter.get("/kpis", async (req: AuthRequest, res: Response) => {
  try {
    const all = await prisma.siniestro.findMany({
      where: { userId: req.userId },
      select: {
        estado: true,
        importeReclamado: true,
        montoAprobado: true,
      },
    });

    const total = all.length;
    const activos = all.filter(
      (s) => s.estado !== "PAGADO" && s.estado !== "RECHAZADO"
    ).length;
    const montoReclamadoTotal = all.reduce(
      (acc, s) => acc + (s.importeReclamado ?? 0),
      0
    );
    const montoPagadoTotal = all
      .filter((s) => s.estado === "PAGADO")
      .reduce((acc, s) => acc + (s.montoAprobado ?? 0), 0);

    res.json({ total, activos, montoReclamadoTotal, montoPagadoTotal });
  } catch (error) {
    console.error("KPIs siniestros error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ─── Export to Excel ──────────────────────────────────────────────────────────
siniestrosRouter.get("/export", async (req: AuthRequest, res: Response) => {
  try {
    const siniestros = await prisma.siniestro.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
    });

    const rows = siniestros.map((s) => ({
      "N° Siniestro": s.numeroSiniestro,
      Cliente: s.clienteNombre,
      Aseguradora: s.aseguradora,
      "Tipo de Seguro": s.tipoSeguro,
      "N° Póliza": s.numeroPoliza,
      "Fecha Siniestro": s.fechaSiniestro.toISOString().split("T")[0],
      Estado: s.estado,
      Prioridad: calcularPrioridad(s.importeReclamado, s.updatedAt),
      "Importe Reclamado": s.importeReclamado ?? 0,
      Deducible: s.deducible ?? 0,
      "Monto Aprobado": s.montoAprobado ?? 0,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Siniestros");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", "attachment; filename=siniestros.xlsx");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buf);
  } catch (error) {
    console.error("Export siniestros error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ─── Create siniestro ─────────────────────────────────────────────────────────
siniestrosRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const {
      numeroSiniestro,
      numeroPoliza,
      aseguradora,
      tipoSeguro,
      clienteNombre,
      clienteDni,
      fechaSiniestro,
      horaSiniestro,
      lugarSiniestro,
      descripcion,
      patente,
      marcaModelo,
      tipoDanio,
      estado,
      responsable,
      importeReclamado,
      deducible,
      montoAprobado,
      ultimoContactoAseguradora,
      ultimoContactoCliente,
    } = req.body;

    if (!numeroSiniestro || !clienteNombre || !fechaSiniestro || !descripcion || !aseguradora || !tipoSeguro || !numeroPoliza) {
      res.status(400).json({ error: "Faltan campos requeridos" });
      return;
    }

    const parsedImporteReclamado = parseOptionalFloat(importeReclamado) as number | null;
    const parsedDeducible = parseOptionalFloat(deducible) as number | null;
    const parsedMontoAprobado = parseOptionalFloat(montoAprobado) as number | null;
    const prioridadCalculada = calcularPrioridad(parsedImporteReclamado, new Date());

    const siniestro = await prisma.siniestro.create({
      data: {
        userId: req.userId!,
        numeroSiniestro,
        numeroPoliza,
        aseguradora,
        tipoSeguro,
        clienteNombre,
        clienteDni,
        fechaSiniestro: new Date(fechaSiniestro),
        horaSiniestro,
        lugarSiniestro,
        descripcion,
        patente,
        marcaModelo,
        tipoDanio,
        estado: estado ?? "DENUNCIADO",
        prioridad: prioridadCalculada,
        responsable,
        importeReclamado: parsedImporteReclamado,
        deducible: parsedDeducible,
        montoAprobado: parsedMontoAprobado,
        ultimoContactoAseguradora: parseOptionalDate(ultimoContactoAseguradora) as Date | null,
        ultimoContactoCliente: parseOptionalDate(ultimoContactoCliente) as Date | null,
      },
      include: { notas: true },
    });

    const withPrioridad = {
      ...siniestro,
      prioridad: calcularPrioridad(siniestro.importeReclamado, siniestro.updatedAt),
    };

    res.status(201).json(withPrioridad);
  } catch (error) {
    console.error("Create siniestro error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ─── Update siniestro ─────────────────────────────────────────────────────────
siniestrosRouter.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.siniestro.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Siniestro no encontrado" });
      return;
    }

    const {
      numeroSiniestro,
      numeroPoliza,
      aseguradora,
      tipoSeguro,
      clienteNombre,
      clienteDni,
      fechaSiniestro,
      horaSiniestro,
      lugarSiniestro,
      descripcion,
      patente,
      marcaModelo,
      tipoDanio,
      estado,
      responsable,
      importeReclamado,
      deducible,
      montoAprobado,
      ultimoContactoAseguradora,
      ultimoContactoCliente,
    } = req.body;

    const parsedImporteReclamado = parseOptionalFloat(importeReclamado);
    const parsedDeducible = parseOptionalFloat(deducible);
    const parsedMontoAprobado = parseOptionalFloat(montoAprobado);
    const prioridadCalculada = calcularPrioridad(
      parsedImporteReclamado === undefined ? existing.importeReclamado : parsedImporteReclamado,
      new Date()
    );

    const updated = await prisma.siniestro.update({
      where: { id },
      data: {
        numeroSiniestro,
        numeroPoliza,
        aseguradora,
        tipoSeguro,
        clienteNombre,
        clienteDni,
        fechaSiniestro: fechaSiniestro ? new Date(fechaSiniestro) : undefined,
        horaSiniestro,
        lugarSiniestro,
        descripcion,
        patente,
        marcaModelo,
        tipoDanio,
        estado,
        prioridad: prioridadCalculada,
        responsable,
        importeReclamado: parsedImporteReclamado,
        deducible: parsedDeducible,
        montoAprobado: parsedMontoAprobado,
        ultimoContactoAseguradora: parseOptionalDate(ultimoContactoAseguradora),
        ultimoContactoCliente: parseOptionalDate(ultimoContactoCliente),
      },
      include: { notas: { orderBy: { createdAt: "desc" } } },
    });

    const withPrioridad = {
      ...updated,
      prioridad: calcularPrioridad(updated.importeReclamado, updated.updatedAt),
    };

    res.json(withPrioridad);
  } catch (error) {
    console.error("Update siniestro error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ─── Delete siniestro ─────────────────────────────────────────────────────────
siniestrosRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.siniestro.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Siniestro no encontrado" });
      return;
    }

    await prisma.siniestro.delete({ where: { id } });
    res.json({ message: "Siniestro eliminado" });
  } catch (error) {
    console.error("Delete siniestro error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ─── Add nota ─────────────────────────────────────────────────────────────────
siniestrosRouter.post("/:id/notas", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { texto } = req.body;

    if (!texto?.trim()) {
      res.status(400).json({ error: "El texto de la nota es requerido" });
      return;
    }

    const existing = await prisma.siniestro.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Siniestro no encontrado" });
      return;
    }

    const nota = await prisma.siniestroNota.create({
      data: { siniestroId: id, texto: texto.trim() },
    });

    res.status(201).json(nota);
  } catch (error) {
    console.error("Add nota error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});
