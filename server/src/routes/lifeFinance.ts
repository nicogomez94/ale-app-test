import { Router, Response } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import * as XLSX from "xlsx";

export const lifeFinanceRouter = Router();
lifeFinanceRouter.use(authMiddleware);

// List life policies
lifeFinanceRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { tipo, search } = req.query;
    const where: any = { userId: req.userId };

    if (tipo) where.tipo = tipo as string;

    if (search) {
      where.OR = [
        { cliente: { contains: search as string, mode: "insensitive" } },
        { cuit: { contains: search as string } },
      ];
    }

    const policies = await prisma.lifePolicy.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json(policies);
  } catch (error) {
    console.error("List life policies error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Create life policy
lifeFinanceRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { cliente, cuit, aseguradora, tipo, sumaAsegurada, prima, aporteMensual, fondoAcumulado, email, telefono, cp } = req.body;

    if (!cliente || !cuit || !aseguradora || !tipo) {
      res.status(400).json({ error: "Cliente, CUIT, aseguradora y tipo son requeridos" });
      return;
    }

    const policy = await prisma.lifePolicy.create({
      data: {
        userId: req.userId!,
        cliente,
        cuit,
        aseguradora,
        tipo,
        sumaAsegurada: sumaAsegurada ? parseFloat(sumaAsegurada) : null,
        prima: prima ? parseFloat(prima) : null,
        aporteMensual: aporteMensual ? parseFloat(aporteMensual) : null,
        fondoAcumulado: fondoAcumulado ? parseFloat(fondoAcumulado) : null,
        email,
        telefono,
        cp,
      },
    });

    res.status(201).json(policy);
  } catch (error) {
    console.error("Create life policy error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Update life policy
lifeFinanceRouter.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.lifePolicy.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Póliza no encontrada" });
      return;
    }

    const { cliente, cuit, aseguradora, tipo, sumaAsegurada, prima, aporteMensual, fondoAcumulado, email, telefono, cp } = req.body;

    const policy = await prisma.lifePolicy.update({
      where: { id },
      data: {
        cliente,
        cuit,
        aseguradora,
        tipo,
        sumaAsegurada: sumaAsegurada != null ? parseFloat(sumaAsegurada) : undefined,
        prima: prima != null ? parseFloat(prima) : undefined,
        aporteMensual: aporteMensual != null ? parseFloat(aporteMensual) : undefined,
        fondoAcumulado: fondoAcumulado != null ? parseFloat(fondoAcumulado) : undefined,
        email,
        telefono,
        cp,
      },
    });

    res.json(policy);
  } catch (error) {
    console.error("Update life policy error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Delete life policy
lifeFinanceRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.lifePolicy.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Póliza no encontrada" });
      return;
    }

    await prisma.lifePolicy.delete({ where: { id } });
    res.json({ message: "Póliza eliminada" });
  } catch (error) {
    console.error("Delete life policy error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Export to Excel
lifeFinanceRouter.get("/export", async (req: AuthRequest, res: Response) => {
  try {
    const { tipo } = req.query;
    const where: any = { userId: req.userId };
    if (tipo) where.tipo = tipo as string;

    const policies = await prisma.lifePolicy.findMany({
      where,
      orderBy: { cliente: "asc" },
      select: {
        cliente: true,
        cuit: true,
        aseguradora: true,
        tipo: true,
        sumaAsegurada: true,
        prima: true,
        aporteMensual: true,
        fondoAcumulado: true,
        email: true,
        telefono: true,
        cp: true,
      },
    });

    const label = tipo || "Vida_Finanzas";
    const ws = XLSX.utils.json_to_sheet(policies);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, String(label));
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=Vida_Finanzas_${label}_PAS_Alert.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error("Export life policies error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});
