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

// ─── List siniestros ──────────────────────────────────────────────────────────
siniestrosRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { estado, prioridad, search } = req.query;

    const where: any = { userId: req.userId };

    if (estado) where.estado = estado as string;
    if (prioridad) where.prioridad = prioridad as string;

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
    }));

    res.json(result);
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
    } = req.body;

    if (!numeroSiniestro || !clienteNombre || !fechaSiniestro || !descripcion || !aseguradora || !tipoSeguro || !numeroPoliza) {
      res.status(400).json({ error: "Faltan campos requeridos" });
      return;
    }

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
        prioridad: "BAJA",
        responsable,
        importeReclamado: importeReclamado ? parseFloat(importeReclamado) : null,
        deducible: deducible ? parseFloat(deducible) : null,
        montoAprobado: montoAprobado ? parseFloat(montoAprobado) : null,
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
        responsable,
        importeReclamado: importeReclamado !== undefined ? parseFloat(importeReclamado) : undefined,
        deducible: deducible !== undefined ? parseFloat(deducible) : undefined,
        montoAprobado: montoAprobado !== undefined ? parseFloat(montoAprobado) : undefined,
        ultimoContactoAseguradora: ultimoContactoAseguradora
          ? new Date(ultimoContactoAseguradora)
          : undefined,
        ultimoContactoCliente: ultimoContactoCliente
          ? new Date(ultimoContactoCliente)
          : undefined,
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
