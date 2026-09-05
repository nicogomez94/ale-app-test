import { Router, Response, NextFunction } from "express";
import multer from 'multer';
import { lifePolicyDetails } from '../lib/lifePolicyDetails.js';
import { deleteCouponPdf, getCouponMaxBytes, readCouponPdf, storeCouponPdf, validatePdfUpload } from '../lib/couponStorage.js';
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import * as XLSX from "xlsx";

export const lifeFinanceRouter = Router();
lifeFinanceRouter.use(authMiddleware);

function uploadCoupon(req: AuthRequest, res: Response, next: NextFunction) {
  multer({ storage: multer.memoryStorage(), limits: { fileSize: getCouponMaxBytes() } }).single('file')(req, res, (error) => {
    if (error) { res.status(400).json({ error: 'No se pudo cargar el PDF. Revisá su tamaño.' }); return; }
    try {
      if (req.is('multipart/form-data')) req.body = JSON.parse(req.body.data);
      next();
    } catch { res.status(400).json({ error: 'Datos de póliza inválidos' }); }
  });
}

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

    const coupons = await prisma.policyCoupon.findMany({ where: { userId: req.userId, policyGroupId: { in: policies.map(p => p.id) } }, select: { policyGroupId: true, originalName: true } });
    res.json(policies.map(policy => ({ ...policy, coupon: coupons.find(c => c.policyGroupId === policy.id) || null })));
  } catch (error) {
    console.error("List life policies error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Create life policy
lifeFinanceRouter.post("/", uploadCoupon, async (req: AuthRequest, res: Response) => {
  let storageKey: string | null = null;
  try {
    const { cliente, cuit, aseguradora, tipo, sumaAsegurada, prima, aporteMensual, fondoAcumulado, email, telefono, direccion, cp, localidad, provincia } = req.body;

    if (!cliente || !cuit || !aseguradora || !tipo) {
      res.status(400).json({ error: "Cliente, CUIT, aseguradora y tipo son requeridos" });
      return;
    }

    const details = lifePolicyDetails(req.body);
    if (req.file) {
      if (details.medioPago !== 'Cupon') { res.status(400).json({ error: 'El PDF requiere pago por cupón' }); return; }
      validatePdfUpload(req.file);
      storageKey = await storeCouponPdf(req.file.buffer);
    }
    const policy = await prisma.$transaction(async tx => {
    const created = await tx.lifePolicy.create({
      data: {
        ...details,
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
        direccion,
        cp,
        localidad,
        provincia,
      },
    });
    if (req.file && storageKey) await tx.policyCoupon.create({ data: { userId: req.userId!, policyGroupId: created.id, storageKey, originalName: req.file.originalname, mimeType: 'application/pdf', sizeBytes: req.file.size } });
    return created;
    });

    res.status(201).json(policy);
  } catch (error) {
    if (storageKey) await deleteCouponPdf(storageKey);
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

    const { cliente, cuit, aseguradora, tipo, sumaAsegurada, prima, aporteMensual, fondoAcumulado, email, telefono, direccion, cp, localidad, provincia } = req.body;

    const policy = await prisma.lifePolicy.update({
      where: { id },
      data: {
        ...lifePolicyDetails(req.body),
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
        direccion,
        cp,
        localidad,
        provincia,
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

    const coupon = await prisma.policyCoupon.findUnique({ where: { userId_policyGroupId: { userId: req.userId!, policyGroupId: id } } });
    await prisma.$transaction(async tx => {
      await tx.policyCoupon.deleteMany({ where: { userId: req.userId!, policyGroupId: id } });
      await tx.lifePolicy.delete({ where: { id } });
    });
    if (coupon) await deleteCouponPdf(coupon.storageKey);
    res.json({ message: "Póliza eliminada" });
  } catch (error) {
    console.error("Delete life policy error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

lifeFinanceRouter.get('/:id/coupon/download', async (req: AuthRequest, res: Response) => {
  try {
    const policy = await prisma.lifePolicy.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!policy) { res.status(404).json({ error: 'Póliza no encontrada' }); return; }
    const coupon = await prisma.policyCoupon.findUnique({ where: { userId_policyGroupId: { userId: req.userId!, policyGroupId: policy.id } } });
    if (!coupon) { res.status(404).json({ error: 'Cupón no encontrado' }); return; }
    const file = await readCouponPdf(coupon.storageKey);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', `attachment; filename="cuponera.pdf"; filename*=UTF-8''${encodeURIComponent(coupon.originalName)}`);
    res.send(file);
  } catch { res.status(500).json({ error: 'No se pudo descargar el cupón' }); }
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
        direccion: true,
        cp: true,
        localidad: true,
        provincia: true,
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
