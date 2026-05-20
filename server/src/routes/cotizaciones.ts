import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import * as XLSX from "xlsx";

export const cotizacionesRouter = Router();

// ─── Public endpoint (no auth) ────────────────────────────────────────────────
// POST /api/cotizaciones/public/:userId  — submitted from the public form
cotizacionesRouter.post(
  "/public/:userId",
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, estado: true },
      });

      if (!user || user.estado !== "ACTIVO") {
        res.status(404).json({ error: "Productor no encontrado" });
        return;
      }

      const cotizacion = await buildCotizacion(userId, req.body, "LINK_PUBLICO");
      res.status(201).json({ message: "Solicitud enviada correctamente", id: cotizacion.id });
    } catch (error) {
      console.error("Public cotizacion error:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
);

// ─── Protected routes ─────────────────────────────────────────────────────────
cotizacionesRouter.use(authMiddleware);

// List cotizaciones
cotizacionesRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { tipo, search } = req.query;

    const where: any = { userId: req.userId };
    if (tipo) where.tipo = tipo as string;

    if (search) {
      where.OR = [
        { nombre: { contains: search as string, mode: "insensitive" } },
        { apellido: { contains: search as string, mode: "insensitive" } },
        { patente: { contains: search as string, mode: "insensitive" } },
        { email: { contains: search as string, mode: "insensitive" } },
        { celular: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const cotizaciones = await prisma.cotizacion.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json(cotizaciones);
  } catch (error) {
    console.error("List cotizaciones error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Export to Excel
cotizacionesRouter.get("/export", async (req: AuthRequest, res: Response) => {
  try {
    const cotizaciones = await prisma.cotizacion.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
    });

    const rows = cotizaciones.map((c) => ({
      Tipo: c.tipo,
      Origen: c.origen,
      Nombre: `${c.nombre}${c.apellido ? ` ${c.apellido}` : ""}`,
      "CUIT/CUIL": c.cuitCuil ?? "",
      Email: c.email ?? "",
      Celular: c.celular ?? "",
      Localidad: c.localidad ?? "",
      Provincia: c.provincia ?? "",
      Patente: c.patente ?? "",
      "Marca/Modelo": c.marca && c.modelo ? `${c.marca} ${c.modelo}` : "",
      Año: c.anio ?? "",
      "Tipo Vivienda": c.tipoVivienda ?? "",
      "Sup. m²": c.superficieCubierta ?? "",
      Descripción: c.descripcionRiesgo ?? "",
      Fecha: c.createdAt.toISOString().split("T")[0],
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Cotizaciones");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=cotizaciones.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buf);
  } catch (error) {
    console.error("Export cotizaciones error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Create cotizacion (manual)
cotizacionesRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const cotizacion = await buildCotizacion(req.userId!, req.body, "MANUAL");
    res.status(201).json(cotizacion);
  } catch (error: any) {
    console.error("Create cotizacion error:", error);
    if (error.message === "INVALID_TIPO") {
      res.status(400).json({ error: "Tipo de cotización inválido" });
      return;
    }
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Update cotizacion
cotizacionesRouter.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.cotizacion.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Cotización no encontrada" });
      return;
    }

    const updated = await prisma.cotizacion.update({
      where: { id },
      data: buildCotizacionData(req.body),
    });

    res.json(updated);
  } catch (error) {
    console.error("Update cotizacion error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Delete cotizacion
cotizacionesRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.cotizacion.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Cotización no encontrada" });
      return;
    }

    await prisma.cotizacion.delete({ where: { id } });
    res.json({ message: "Cotización eliminada" });
  } catch (error) {
    console.error("Delete cotizacion error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const VALID_TIPOS = ["AUTO", "MOTO", "HOGAR", "OTROS"] as const;

function buildCotizacionData(body: any) {
  return {
    tipo: body.tipo,
    nombre: body.nombre,
    apellido: body.apellido ?? null,
    cuitCuil: body.cuitCuil ?? null,
    fechaNacimiento: body.fechaNacimiento ?? null,
    email: body.email ?? null,
    celular: body.celular ?? null,
    calle: body.calle ?? null,
    cp: body.cp ?? null,
    localidad: body.localidad ?? null,
    provincia: body.provincia ?? null,
    marca: body.marca ?? null,
    modelo: body.modelo ?? null,
    anio: body.anio ? parseInt(body.anio) : null,
    patente: body.patente ?? null,
    tipoUso: body.tipoUso ?? null,
    tieneGnc: body.tieneGnc !== undefined ? Boolean(body.tieneGnc) : null,
    tieneGps: body.tieneGps !== undefined ? Boolean(body.tieneGps) : null,
    formaPago: body.formaPago ?? null,
    tipoVivienda: body.tipoVivienda ?? null,
    superficieCubierta: body.superficieCubierta
      ? parseFloat(body.superficieCubierta)
      : null,
    descripcionRiesgo: body.descripcionRiesgo ?? null,
  };
}

async function buildCotizacion(
  userId: string,
  body: any,
  origen: "MANUAL" | "LINK_PUBLICO"
) {
  const tipo = body.tipo?.toUpperCase();
  if (!VALID_TIPOS.includes(tipo)) throw new Error("INVALID_TIPO");
  if (!body.nombre?.trim()) throw new Error("MISSING_NOMBRE");

  return prisma.cotizacion.create({
    data: {
      userId,
      origen,
      ...buildCotizacionData({ ...body, tipo }),
    },
  });
}
