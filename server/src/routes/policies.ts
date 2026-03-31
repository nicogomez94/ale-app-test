import { Router, Response } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";

export const policiesRouter = Router();
policiesRouter.use(authMiddleware);

// Helper: compute policy status based on dates
function computeStatus(fechaVencimiento: Date): "ACTIVA" | "VENCE_PRONTO" | "VENCIDA" {
  const now = new Date();
  const diff = fechaVencimiento.getTime() - now.getTime();
  const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return "VENCIDA";
  if (daysLeft <= 7) return "VENCE_PRONTO";
  return "ACTIVA";
}

// List policies
policiesRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { tipo, estado, rubro, search } = req.query;
    const where: any = { userId: req.userId };

    if (tipo) where.tipo = tipo as string;
    if (estado) where.estado = estado as string;
    if (rubro) where.rubro = rubro as string;
    if (search) {
      where.OR = [
        { clienteNombre: { contains: search as string, mode: "insensitive" } },
        { numeroPoliza: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const policies = await prisma.policy.findMany({
      where,
      orderBy: { fechaVencimiento: "asc" },
      include: {
        cliente: { select: { id: true, nombre: true, telefono: true, email: true } },
        company: { select: { id: true, razonSocial: true, telefono: true, email: true } },
      },
    });

    res.json(policies);
  } catch (error) {
    console.error("List policies error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Create policy
policiesRouter.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const {
      clienteId,
      companyId,
      clienteNombre,
      clienteDni,
      clienteTelefono,
      aseguradora,
      rubro,
      numeroPoliza,
      fechaInicio,
      fechaVencimiento,
      medioPago,
      prima,
      porcentajeComision,
      tipo,
    } = req.body;

    if (!clienteNombre || !aseguradora || !rubro || !numeroPoliza || !fechaInicio || !fechaVencimiento || prima == null || porcentajeComision == null) {
      res.status(400).json({ error: "Campos obligatorios faltantes" });
      return;
    }

    const comisionCalculada = prima * (porcentajeComision / 100);
    const venc = new Date(fechaVencimiento);
    const estado = computeStatus(venc);

    const policy = await prisma.policy.create({
      data: {
        userId: req.userId!,
        clienteId: clienteId || null,
        companyId: companyId || null,
        clienteNombre,
        clienteDni,
        clienteTelefono,
        aseguradora,
        rubro,
        numeroPoliza,
        fechaInicio: new Date(fechaInicio),
        fechaVencimiento: venc,
        medioPago,
        prima: parseFloat(prima),
        porcentajeComision: parseFloat(porcentajeComision),
        comisionCalculada,
        estado,
        tipo: tipo || "INDIVIDUAL",
      },
    });

    res.status(201).json(policy);
  } catch (error) {
    console.error("Create policy error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Update policy
policiesRouter.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.policy.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Póliza no encontrada" });
      return;
    }

    const {
      clienteNombre,
      clienteDni,
      clienteTelefono,
      aseguradora,
      rubro,
      numeroPoliza,
      fechaInicio,
      fechaVencimiento,
      medioPago,
      prima,
      porcentajeComision,
      tipo,
    } = req.body;

    const comisionCalculada = prima != null && porcentajeComision != null
      ? parseFloat(prima) * (parseFloat(porcentajeComision) / 100)
      : existing.comisionCalculada;

    const venc = fechaVencimiento ? new Date(fechaVencimiento) : existing.fechaVencimiento;
    const estado = computeStatus(venc);

    const policy = await prisma.policy.update({
      where: { id },
      data: {
        clienteNombre,
        clienteDni,
        clienteTelefono,
        aseguradora,
        rubro,
        numeroPoliza,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : undefined,
        fechaVencimiento: venc,
        medioPago,
        prima: prima != null ? parseFloat(prima) : undefined,
        porcentajeComision: porcentajeComision != null ? parseFloat(porcentajeComision) : undefined,
        comisionCalculada,
        estado,
        tipo,
      },
    });

    res.json(policy);
  } catch (error) {
    console.error("Update policy error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Delete policy
policiesRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.policy.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Póliza no encontrada" });
      return;
    }

    await prisma.policy.delete({ where: { id } });
    res.json({ message: "Póliza eliminada" });
  } catch (error) {
    console.error("Delete policy error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Batch update policy statuses (called by cron or manually)
policiesRouter.post("/update-statuses", async (req: AuthRequest, res: Response) => {
  try {
    const policies = await prisma.policy.findMany({
      where: { userId: req.userId },
    });

    let updated = 0;
    for (const policy of policies) {
      const newStatus = computeStatus(policy.fechaVencimiento);
      if (newStatus !== policy.estado) {
        await prisma.policy.update({
          where: { id: policy.id },
          data: { estado: newStatus },
        });
        updated++;
      }
    }

    res.json({ message: `${updated} pólizas actualizadas` });
  } catch (error) {
    console.error("Update statuses error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});
