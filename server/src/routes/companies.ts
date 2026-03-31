import { Router, Response } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import * as XLSX from "xlsx";

export const companiesRouter = Router();
companiesRouter.use(authMiddleware);

// List companies (filtered by tipo)
companiesRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { tipo, search } = req.query;
    const where: any = { userId: req.userId };

    if (tipo) {
      where.tipo = tipo as string;
    }

    if (search) {
      where.OR = [
        { razonSocial: { contains: search as string, mode: "insensitive" } },
        { cuit: { contains: search as string } },
      ];
    }

    const companies = await prisma.company.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json(companies);
  } catch (error) {
    console.error("List companies error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Create company
companiesRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { razonSocial, cuit, ramo, empleados, vehiculos, aseguradora, email, telefono, direccion, cp, tipo } = req.body;

    if (!razonSocial || !cuit || !aseguradora || !email || !telefono || !tipo) {
      res.status(400).json({ error: "Razón social, CUIT, aseguradora, email, teléfono y tipo son requeridos" });
      return;
    }

    const company = await prisma.company.create({
      data: {
        userId: req.userId!,
        razonSocial,
        cuit,
        ramo,
        empleados: empleados ? parseInt(empleados) : null,
        vehiculos: vehiculos ? parseInt(vehiculos) : null,
        aseguradora,
        email,
        telefono,
        direccion,
        cp,
        tipo,
      },
    });

    res.status(201).json(company);
  } catch (error) {
    console.error("Create company error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Update company
companiesRouter.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { razonSocial, cuit, ramo, empleados, vehiculos, aseguradora, email, telefono, direccion, cp, tipo } = req.body;

    const existing = await prisma.company.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Empresa no encontrada" });
      return;
    }

    const company = await prisma.company.update({
      where: { id },
      data: {
        razonSocial,
        cuit,
        ramo,
        empleados: empleados != null ? parseInt(empleados) : null,
        vehiculos: vehiculos != null ? parseInt(vehiculos) : null,
        aseguradora,
        email,
        telefono,
        direccion,
        cp,
        tipo,
      },
    });

    res.json(company);
  } catch (error) {
    console.error("Update company error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Delete company
companiesRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.company.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Empresa no encontrada" });
      return;
    }

    await prisma.company.delete({ where: { id } });
    res.json({ message: "Empresa eliminada" });
  } catch (error) {
    console.error("Delete company error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Export to Excel
companiesRouter.get("/export", async (req: AuthRequest, res: Response) => {
  try {
    const { tipo } = req.query;
    const where: any = { userId: req.userId };
    if (tipo) where.tipo = tipo as string;

    const companies = await prisma.company.findMany({
      where,
      orderBy: { razonSocial: "asc" },
      select: {
        razonSocial: true,
        cuit: true,
        ramo: true,
        empleados: true,
        vehiculos: true,
        aseguradora: true,
        email: true,
        telefono: true,
        direccion: true,
        cp: true,
        tipo: true,
      },
    });

    const label = tipo || "Empresas";
    const ws = XLSX.utils.json_to_sheet(companies);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, String(label));
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=Empresas_${label}_PAS_Alert.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error("Export companies error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});
