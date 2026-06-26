import { Router, Request, Response } from "express";
import type { Cotizacion } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { subscriptionGuard } from "../middleware/subscriptionGuard.js";
import { sendEmail } from "../lib/email.js";
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
    } catch (error: any) {
      console.error("Public cotizacion error:", error);
      if (error.message === "INVALID_TIPO") {
        res.status(400).json({ error: "Tipo de cotización inválido" });
        return;
      }
      if (error.message === "MISSING_NOMBRE") {
        res.status(400).json({ error: "El nombre es requerido" });
        return;
      }
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
);

// ─── Protected routes ─────────────────────────────────────────────────────────
cotizacionesRouter.use(authMiddleware);
cotizacionesRouter.use(subscriptionGuard);

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
    const { tipo } = req.query;
    const where: any = { userId: req.userId };
    if (tipo) where.tipo = normalizeCotizacionTipo(tipo);

    const cotizaciones = await prisma.cotizacion.findMany({
      where,
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
      Uso: c.tipoUso ?? "",
      "Marca/Modelo": c.marca && c.modelo ? `${c.marca} ${c.modelo}` : "",
      Año: c.anio ?? "",
      "Tipo Vivienda": c.tipoVivienda ?? "",
      "Sup. m²": c.superficieCubierta ?? "",
      Descripción: c.descripcionRiesgo ?? "",
      "Forma de Pago": c.formaPago ?? "",
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
  } catch (error: any) {
    console.error("Export cotizaciones error:", error);
    if (error.message === "INVALID_TIPO") {
      res.status(400).json({ error: "Tipo de cotización inválido" });
      return;
    }
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
  } catch (error: any) {
    console.error("Update cotizacion error:", error);
    if (error.message === "INVALID_TIPO") {
      res.status(400).json({ error: "Tipo de cotización inválido" });
      return;
    }
    if (error.message === "MISSING_NOMBRE") {
      res.status(400).json({ error: "El nombre es requerido" });
      return;
    }
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Mark cotizacion as viewed by the PAS
cotizacionesRouter.patch("/:id/viewed", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.cotizacion.findFirst({
      where: { id, userId: req.userId },
      select: { id: true, viewedAt: true },
    });

    if (!existing) {
      res.status(404).json({ error: "Cotización no encontrada" });
      return;
    }

    const cotizacion = await prisma.cotizacion.update({
      where: { id },
      data: { viewedAt: existing.viewedAt || new Date() },
    });

    res.json(cotizacion);
  } catch (error) {
    console.error("Mark cotizacion viewed error:", error);
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
type ValidCotizacionTipo = typeof VALID_TIPOS[number];

function normalizeCotizacionTipo(value: unknown): ValidCotizacionTipo {
  const tipo = typeof value === "string" ? value.toUpperCase() : value;
  if (!VALID_TIPOS.includes(tipo as ValidCotizacionTipo)) throw new Error("INVALID_TIPO");
  return tipo as ValidCotizacionTipo;
}

function buildCotizacionData(body: any) {
  const tipo = normalizeCotizacionTipo(body.tipo);
  const isAutoMoto = tipo === "AUTO" || tipo === "MOTO";
  const isHogar = tipo === "HOGAR";
  const isOtros = tipo === "OTROS";

  if (!body.nombre?.trim()) throw new Error("MISSING_NOMBRE");

  return {
    tipo,
    nombre: body.nombre.trim(),
    apellido: body.apellido?.trim() || null,
    cuitCuil: body.cuitCuil?.trim() || null,
    fechaNacimiento: body.fechaNacimiento || null,
    email: body.email?.trim() || null,
    celular: body.celular?.trim() || null,
    calle: body.calle?.trim() || null,
    cp: body.cp?.trim() || null,
    localidad: body.localidad?.trim() || null,
    provincia: body.provincia || null,
    marca: isAutoMoto ? body.marca?.trim() || null : null,
    modelo: isAutoMoto ? body.modelo?.trim() || null : null,
    anio: isAutoMoto && body.anio ? parseInt(body.anio) : null,
    patente: isAutoMoto ? body.patente?.trim() || null : null,
    tipoUso: isAutoMoto ? body.tipoUso || null : null,
    tieneGnc: isAutoMoto && body.tieneGnc !== undefined ? Boolean(body.tieneGnc) : null,
    tieneGps: isAutoMoto && body.tieneGps !== undefined ? Boolean(body.tieneGps) : null,
    formaPago: body.formaPago || null,
    tipoVivienda: isHogar ? body.tipoVivienda || null : null,
    superficieCubierta: isHogar && body.superficieCubierta
      ? parseFloat(body.superficieCubierta)
      : null,
    descripcionRiesgo: isOtros ? body.descripcionRiesgo?.trim() || null : null,
  };
}

async function buildCotizacion(
  userId: string,
  body: any,
  origen: "MANUAL" | "LINK_PUBLICO"
) {
  const tipo = normalizeCotizacionTipo(body.tipo);

  const cotizacion = await prisma.cotizacion.create({
    data: {
      userId,
      origen,
      ...buildCotizacionData({ ...body, tipo }),
    },
  });

  notifyCotizacion(cotizacion).catch((err) => {
    console.error("Error enviando email de cotizacion:", err);
  });

  return cotizacion;
}

function notifyCotizacion(cotizacion: Cotizacion) {
  const to = process.env.COTIZACIONES_MAIL_TO || process.env.MAIL_TO;
  if (!to) {
    console.warn("COTIZACIONES_MAIL_TO no configurado; se omite email de cotizacion.");
    return Promise.resolve();
  }

  const fullName = [cotizacion.nombre, cotizacion.apellido].filter(Boolean).join(" ");
  const senderEmail = cotizacion.email || to;

  return sendEmail({
    name: fullName || "Nueva cotizacion",
    email: senderEmail,
    to,
    message: buildCotizacionEmailMessage(cotizacion, fullName),
  });
}

function buildCotizacionEmailMessage(cotizacion: Cotizacion, fullName: string) {
  const lines = [
    `Nueva solicitud de cotizacion: ${tipoLabel(cotizacion.tipo)}`,
    "",
    `Origen: ${origenLabel(cotizacion.origen)}`,
    `Nombre: ${fullName || cotizacion.nombre}`,
    fieldLine("CUIT/CUIL", cotizacion.cuitCuil),
    fieldLine("Email", cotizacion.email),
    fieldLine("Celular", cotizacion.celular),
    fieldLine("Localidad", cotizacion.localidad),
    fieldLine("Provincia", cotizacion.provincia),
    fieldLine("Direccion", [cotizacion.calle, cotizacion.cp].filter(Boolean).join(" - ")),
    "",
    ...cotizacionDetailLines(cotizacion),
  ].filter((line): line is string => line !== null);

  return lines.join("\n");
}

function cotizacionDetailLines(cotizacion: Cotizacion) {
  if (cotizacion.tipo === "AUTO" || cotizacion.tipo === "MOTO") {
    return [
      "Datos del vehiculo:",
      fieldLine("Marca", cotizacion.marca),
      fieldLine("Modelo", cotizacion.modelo),
      fieldLine("Anio", cotizacion.anio?.toString()),
      fieldLine("Patente", cotizacion.patente),
      fieldLine("Uso", cotizacion.tipoUso),
      fieldLine("GNC", cotizacion.tieneGnc === null ? null : cotizacion.tieneGnc ? "Si" : "No"),
      fieldLine("GPS", cotizacion.tieneGps === null ? null : cotizacion.tieneGps ? "Si" : "No"),
      fieldLine("Forma de pago", cotizacion.formaPago),
    ].filter((line): line is string => line !== null);
  }

  if (cotizacion.tipo === "HOGAR") {
    return [
      "Datos del hogar:",
      fieldLine("Tipo de vivienda", cotizacion.tipoVivienda),
      fieldLine("Superficie cubierta", cotizacion.superficieCubierta ? `${cotizacion.superficieCubierta} m2` : null),
      fieldLine("Forma de pago", cotizacion.formaPago),
    ].filter((line): line is string => line !== null);
  }

  return [
    "Datos del riesgo:",
    fieldLine("Descripcion", cotizacion.descripcionRiesgo),
    fieldLine("Forma de pago", cotizacion.formaPago),
  ].filter((line): line is string => line !== null);
}

function fieldLine(label: string, value: string | null | undefined) {
  return value ? `${label}: ${value}` : null;
}

function tipoLabel(tipo: string) {
  const labels: Record<string, string> = {
    AUTO: "Auto",
    MOTO: "Moto",
    HOGAR: "Hogar",
    OTROS: "Otros",
  };
  return labels[tipo] || tipo;
}

function origenLabel(origen: string) {
  return origen === "LINK_PUBLICO" ? "Link publico" : "Carga manual";
}
