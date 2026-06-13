import { Router, Response } from "express";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import * as XLSX from "xlsx";
import { CommissionInvoiceStatus, CurrencyType } from "@prisma/client";

export const commissionsRouter = Router();
commissionsRouter.use(authMiddleware);

const INVOICE_STATUSES = new Set<CommissionInvoiceStatus>([
  "PENDIENTE",
  "FACTURADA",
  "COBRADA",
  "PARCIAL",
  "VENCIDA",
]);

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeInvoiceStatus(value: unknown): CommissionInvoiceStatus {
  return typeof value === "string" && INVOICE_STATUSES.has(value as CommissionInvoiceStatus)
    ? value as CommissionInvoiceStatus
    : "PENDIENTE";
}

function normalizeInvoiceCurrency(value: unknown): CurrencyType {
  return value === "USD" ? "USD" : "ARS";
}

async function ensureOwnedInsuranceCompany(userId: string, insuranceCompanyId?: string | null) {
  if (!insuranceCompanyId) return;
  const count = await prisma.insuranceCompany.count({ where: { id: insuranceCompanyId, userId } });
  if (count !== 1) {
    throw new Error("Aseguradora no encontrada");
  }
}

async function ensureOwnedPolicies(userId: string, policyIds: string[]) {
  if (policyIds.length === 0) return;
  const count = await prisma.policy.count({ where: { userId, id: { in: policyIds } } });
  if (count !== policyIds.length) {
    throw new Error("Una o mas polizas seleccionadas no pertenecen al usuario");
  }
}

function uniqueStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())));
}

const invoiceInclude = {
  insuranceCompany: {
    select: {
      id: true,
      razonSocial: true,
      cuit: true,
    },
  },
  payments: {
    orderBy: { fechaPago: "asc" as const },
  },
  policies: {
    include: {
      policy: {
        select: {
          id: true,
          clienteNombre: true,
          aseguradora: true,
          rubro: true,
          numeroPoliza: true,
          fechaInicio: true,
          fechaVencimiento: true,
          prima: true,
          moneda: true,
          porcentajeComision: true,
          comisionCalculada: true,
          cuotaActual: true,
          cuotaTotal: true,
        },
      },
    },
  },
};

function serializeInvoice(invoice: any) {
  const payments = invoice.payments || [];
  const policyLinks = invoice.policies || [];
  const montoCobrado = payments.reduce((sum: number, payment: any) => sum + Number(payment.monto || 0), 0);
  const saldoPendiente = Math.max(0, Number(invoice.monto || 0) - montoCobrado);
  const montoEsperado = policyLinks.reduce((sum: number, link: any) => sum + Number(link.policy?.comisionCalculada || 0), 0);
  const diferenciaDetectada = policyLinks.length > 0 && Math.abs(montoEsperado - Number(invoice.monto || 0)) > 0.01;
  const vencida =
    invoice.fechaVencimiento &&
    new Date(invoice.fechaVencimiento).getTime() < Date.now() &&
    saldoPendiente > 0 &&
    invoice.estado !== "COBRADA";
  const estadoCalculado =
    saldoPendiente <= 0 && Number(invoice.monto || 0) > 0
      ? "COBRADA"
      : montoCobrado > 0
        ? "PARCIAL"
        : vencida
          ? "VENCIDA"
          : invoice.estado;

  return {
    id: invoice.id,
    insuranceCompanyId: invoice.insuranceCompanyId,
    insuranceCompany: invoice.insuranceCompany,
    periodo: invoice.periodo,
    numeroFactura: invoice.numeroFactura,
    fechaEmision: invoice.fechaEmision ? invoice.fechaEmision.toISOString().split("T")[0] : "",
    fechaVencimiento: invoice.fechaVencimiento ? invoice.fechaVencimiento.toISOString().split("T")[0] : "",
    estado: invoice.estado,
    estadoCalculado,
    monto: invoice.monto,
    moneda: invoice.moneda,
    comprobanteUrl: invoice.comprobanteUrl,
    notes: invoice.notes,
    montoCobrado,
    saldoPendiente,
    montoEsperado,
    diferenciaDetectada,
    payments: payments.map((payment: any) => ({
      id: payment.id,
      fechaPago: payment.fechaPago ? payment.fechaPago.toISOString().split("T")[0] : "",
      monto: payment.monto,
      medioPago: payment.medioPago,
      comprobanteUrl: payment.comprobanteUrl,
    })),
    policies: policyLinks.map((link: any) => ({
      id: link.policy.id,
      clienteNombre: link.policy.clienteNombre,
      aseguradora: link.policy.aseguradora,
      rubro: link.policy.rubro,
      numeroPoliza: link.policy.numeroPoliza,
      fechaInicio: link.policy.fechaInicio ? link.policy.fechaInicio.toISOString().split("T")[0] : "",
      fechaVencimiento: link.policy.fechaVencimiento ? link.policy.fechaVencimiento.toISOString().split("T")[0] : "",
      prima: link.policy.prima,
      moneda: link.policy.moneda,
      porcentajeComision: link.policy.porcentajeComision,
      comisionCalculada: link.policy.comisionCalculada,
      cuotaActual: link.policy.cuotaActual,
      cuotaTotal: link.policy.cuotaTotal,
    })),
  };
}

function getPaymentSyncedStatus(invoice: { monto: number; estado: CommissionInvoiceStatus }, montoCobrado: number): CommissionInvoiceStatus {
  if (Number(invoice.monto || 0) > 0 && montoCobrado >= Number(invoice.monto || 0)) return "COBRADA";
  if (montoCobrado > 0) return "PARCIAL";
  if (invoice.estado === "COBRADA" || invoice.estado === "PARCIAL") return "PENDIENTE";
  return invoice.estado;
}

async function fetchInvoice(userId: string, id: string) {
  return prisma.commissionInvoice.findFirst({
    where: { id, userId },
    include: invoiceInclude,
  });
}

// Detailed commission invoices
commissionsRouter.get("/invoices", async (req: AuthRequest, res: Response) => {
  try {
    const search = asText(req.query.search);
    const periodo = asText(req.query.periodo);
    const insuranceCompanyId = asText(req.query.insuranceCompanyId);
    const status = asText(req.query.estado);

    const invoices = await prisma.commissionInvoice.findMany({
      where: {
        userId: req.userId!,
        ...(periodo ? { periodo } : {}),
        ...(insuranceCompanyId ? { insuranceCompanyId } : {}),
        ...(status && INVOICE_STATUSES.has(status as CommissionInvoiceStatus) ? { estado: status as CommissionInvoiceStatus } : {}),
        ...(search
          ? {
              OR: [
                { numeroFactura: { contains: search, mode: "insensitive" } },
                { periodo: { contains: search, mode: "insensitive" } },
                { insuranceCompany: { is: { razonSocial: { contains: search, mode: "insensitive" } } } },
              ],
            }
          : {}),
      },
      orderBy: { fechaEmision: "desc" },
      include: invoiceInclude,
    });

    res.json(invoices.map(serializeInvoice));
  } catch (error) {
    console.error("List commission invoices error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

commissionsRouter.get("/invoices/export", async (req: AuthRequest, res: Response) => {
  try {
    const invoices = await prisma.commissionInvoice.findMany({
      where: { userId: req.userId! },
      orderBy: { fechaEmision: "desc" },
      include: invoiceInclude,
    });

    const data = invoices.map((invoice: any) => {
      const item = serializeInvoice(invoice);
      return {
        Aseguradora: item.insuranceCompany?.razonSocial || "",
        Periodo: item.periodo,
        "Numero Factura": item.numeroFactura,
        "Fecha Emision": item.fechaEmision,
        Vencimiento: item.fechaVencimiento,
        Estado: item.estadoCalculado,
        Moneda: item.moneda,
        Monto: item.monto,
        "Monto Cobrado": item.montoCobrado,
        "Saldo Pendiente": item.saldoPendiente,
        "Monto Esperado": item.montoEsperado,
        "Diferencia Detectada": item.diferenciaDetectada ? "SI" : "NO",
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Facturas");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=Facturas_Comisiones_PAS_Alert.xlsx");
    res.send(buffer);
  } catch (error) {
    console.error("Export commission invoices error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

commissionsRouter.post("/invoices", async (req: AuthRequest, res: Response) => {
  try {
    const insuranceCompanyId = asText(req.body?.insuranceCompanyId);
    const policyIds = uniqueStringArray(req.body?.policyIds);
    await ensureOwnedInsuranceCompany(req.userId!, insuranceCompanyId);
    await ensureOwnedPolicies(req.userId!, policyIds);

    const periodo = asText(req.body?.periodo);
    const numeroFactura = asText(req.body?.numeroFactura);
    const fechaEmision = asDate(req.body?.fechaEmision);
    const monto = asNumber(req.body?.monto);

    if (!periodo || !numeroFactura || !fechaEmision || monto == null || monto <= 0) {
      res.status(400).json({ error: "Periodo, numero, fecha de emision y monto son requeridos" });
      return;
    }

    const invoice = await prisma.commissionInvoice.create({
      data: {
        userId: req.userId!,
        insuranceCompanyId,
        periodo,
        numeroFactura,
        fechaEmision,
        fechaVencimiento: asDate(req.body?.fechaVencimiento),
        estado: normalizeInvoiceStatus(req.body?.estado),
        monto,
        moneda: normalizeInvoiceCurrency(req.body?.moneda),
        comprobanteUrl: asText(req.body?.comprobanteUrl),
        notes: asText(req.body?.notes),
        policies: {
          create: policyIds.map((policyId) => ({ policyId })),
        },
      },
      include: invoiceInclude,
    });

    res.status(201).json(serializeInvoice(invoice));
  } catch (error) {
    console.error("Create commission invoice error:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    res.status(message.includes("pertenecen") || message.includes("Aseguradora") ? 400 : 500).json({ error: message });
  }
});

commissionsRouter.put("/invoices/:id", async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.commissionInvoice.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!existing) {
      res.status(404).json({ error: "Factura no encontrada" });
      return;
    }

    const insuranceCompanyId = asText(req.body?.insuranceCompanyId);
    const policyIds = Array.isArray(req.body?.policyIds) ? uniqueStringArray(req.body.policyIds) : undefined;
    await ensureOwnedInsuranceCompany(req.userId!, insuranceCompanyId);
    if (policyIds) await ensureOwnedPolicies(req.userId!, policyIds);

    const periodo = asText(req.body?.periodo);
    const numeroFactura = asText(req.body?.numeroFactura);
    const fechaEmision = asDate(req.body?.fechaEmision);
    const monto = asNumber(req.body?.monto);

    if (!periodo || !numeroFactura || !fechaEmision || monto == null || monto <= 0) {
      res.status(400).json({ error: "Periodo, numero, fecha de emision y monto son requeridos" });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (policyIds) {
        await tx.commissionInvoicePolicy.deleteMany({ where: { invoiceId: req.params.id } });
        if (policyIds.length > 0) {
          await tx.commissionInvoicePolicy.createMany({
            data: policyIds.map((policyId) => ({ invoiceId: req.params.id, policyId })),
          });
        }
      }

      return tx.commissionInvoice.update({
        where: { id: req.params.id },
        data: {
          insuranceCompanyId,
          periodo,
          numeroFactura,
          fechaEmision,
          fechaVencimiento: asDate(req.body?.fechaVencimiento),
          estado: normalizeInvoiceStatus(req.body?.estado),
          monto,
          moneda: normalizeInvoiceCurrency(req.body?.moneda),
          comprobanteUrl: asText(req.body?.comprobanteUrl),
          notes: asText(req.body?.notes),
        },
        include: invoiceInclude,
      });
    });

    res.json(serializeInvoice(updated));
  } catch (error) {
    console.error("Update commission invoice error:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    res.status(message.includes("pertenecen") || message.includes("Aseguradora") ? 400 : 500).json({ error: message });
  }
});

commissionsRouter.delete("/invoices/:id", async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.commissionInvoice.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({ error: "Factura no encontrada" });
      return;
    }

    await prisma.commissionInvoice.delete({ where: { id: req.params.id } });
    res.json({ message: "Factura eliminada" });
  } catch (error) {
    console.error("Delete commission invoice error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

commissionsRouter.post("/invoices/:invoiceId/payments", async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await prisma.commissionInvoice.findFirst({
      where: { id: req.params.invoiceId, userId: req.userId! },
      select: {
        id: true,
        monto: true,
        estado: true,
        payments: { select: { monto: true } },
      },
    });

    if (!invoice) {
      res.status(404).json({ error: "Factura no encontrada" });
      return;
    }

    const fechaPago = asDate(req.body?.fechaPago);
    const monto = asNumber(req.body?.monto);
    if (!fechaPago || monto == null || monto <= 0) {
      res.status(400).json({ error: "Fecha y monto de pago son requeridos" });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.commissionInvoicePayment.create({
        data: {
          invoiceId: invoice.id,
          fechaPago,
          monto,
          medioPago: asText(req.body?.medioPago),
          comprobanteUrl: asText(req.body?.comprobanteUrl),
        },
      });

      const montoCobrado = invoice.payments.reduce((sum, payment) => sum + Number(payment.monto || 0), 0) + monto;
      await tx.commissionInvoice.update({
        where: { id: invoice.id },
        data: { estado: getPaymentSyncedStatus(invoice, montoCobrado) },
      });
    });

    const updated = await fetchInvoice(req.userId!, invoice.id);
    res.status(201).json(serializeInvoice(updated));
  } catch (error) {
    console.error("Create invoice payment error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

commissionsRouter.delete("/invoices/:invoiceId/payments/:paymentId", async (req: AuthRequest, res: Response) => {
  try {
    const payment = await prisma.commissionInvoicePayment.findFirst({
      where: {
        id: req.params.paymentId,
        invoiceId: req.params.invoiceId,
        invoice: { userId: req.userId! },
      },
      select: { id: true },
    });

    if (!payment) {
      res.status(404).json({ error: "Pago no encontrado" });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.commissionInvoicePayment.delete({ where: { id: payment.id } });
      const invoice = await tx.commissionInvoice.findFirst({
        where: { id: req.params.invoiceId, userId: req.userId! },
        select: {
          id: true,
          monto: true,
          estado: true,
          payments: { select: { monto: true } },
        },
      });

      if (invoice) {
        const montoCobrado = invoice.payments.reduce((sum, item) => sum + Number(item.monto || 0), 0);
        await tx.commissionInvoice.update({
          where: { id: invoice.id },
          data: { estado: getPaymentSyncedStatus(invoice, montoCobrado) },
        });
      }
    });
    const updated = await fetchInvoice(req.userId!, req.params.invoiceId);
    res.json(serializeInvoice(updated));
  } catch (error) {
    console.error("Delete invoice payment error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Get commissions summary for current month
commissionsRouter.get("/summary", async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Active policies with commission data
    const policies = await prisma.policy.findMany({
      where: {
        userId: req.userId,
        estado: { not: "VENCIDA" },
      },
    });

    const totalPrima = policies.reduce((sum: number, p: any) => sum + p.prima, 0);
    const totalComision = policies.reduce((sum: number, p: any) => sum + p.comisionCalculada, 0);
    const avgComision = policies.length > 0 ? totalComision / policies.length : 0;
    const invoices = await prisma.commissionInvoice.findMany({
      where: { userId: req.userId },
      select: {
        monto: true,
        moneda: true,
        payments: { select: { monto: true } },
      },
    });

    const facturacion = invoices.reduce((acc, invoice) => {
      const key = invoice.moneda === "USD" ? "USD" : "ARS";
      const cobrado = invoice.payments.reduce((sum, payment) => sum + Number(payment.monto || 0), 0);
      acc[key].facturado += Number(invoice.monto || 0);
      acc[key].cobrado += cobrado;
      acc[key].saldo += Math.max(0, Number(invoice.monto || 0) - cobrado);
      return acc;
    }, {
      ARS: { facturado: 0, cobrado: 0, saldo: 0 },
      USD: { facturado: 0, cobrado: 0, saldo: 0 },
    } as Record<"ARS" | "USD", { facturado: number; cobrado: number; saldo: number }>);

    // Commission by rubro
    const byRubro: Record<string, number> = {};
    for (const p of policies) {
      const key = p.rubro || "Otros";
      byRubro[key] = (byRubro[key] || 0) + p.comisionCalculada;
    }

    const distribucion = Object.entries(byRubro).map(([name, value]) => ({
      name,
      value: Math.round(value),
    }));

    res.json({
      comisionProyectada: Math.round(totalComision),
      totalPrima: Math.round(totalPrima),
      promedioPoliza: Math.round(avgComision),
      totalPolizas: policies.length,
      distribucion,
      facturacion,
    });
  } catch (error) {
    console.error("Commissions summary error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Get monthly history
commissionsRouter.get("/monthly", async (req: AuthRequest, res: Response) => {
  try {
    const closes = await prisma.commissionClose.findMany({
      where: { userId: req.userId },
      orderBy: [{ anio: "asc" }, { mes: "asc" }],
    });

    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    const monthly = closes.map((c: any) => ({
      id: c.id,
      name: meses[c.mes - 1],
      mes: c.mes,
      anio: c.anio,
      totalPrima: c.totalPrima,
      comision: c.comisionBruta,
      crecimiento: c.crecimiento,
    }));

    res.json(monthly);
  } catch (error) {
    console.error("Monthly commissions error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Close month (cierre mensual)
commissionsRouter.post("/close", async (req: AuthRequest, res: Response) => {
  try {
    const { mes, anio } = req.body;

    if (!mes || !anio) {
      res.status(400).json({ error: "Mes y año son requeridos" });
      return;
    }

    // Check if already closed
    const existing = await prisma.commissionClose.findUnique({
      where: {
        userId_mes_anio: {
          userId: req.userId!,
          mes: parseInt(mes),
          anio: parseInt(anio),
        },
      },
    });

    if (existing) {
      res.status(409).json({ error: "Este mes ya fue cerrado" });
      return;
    }

    // Calculate from active policies
    const policies = await prisma.policy.findMany({
      where: {
        userId: req.userId,
        estado: { not: "VENCIDA" },
      },
    });

    const totalPrima = policies.reduce((sum: number, p: any) => sum + p.prima, 0);
    const comisionBruta = policies.reduce((sum: number, p: any) => sum + p.comisionCalculada, 0);

    // Get previous month's close for growth calculation
    let crecimiento: number | null = null;
    const prevMonth = parseInt(mes) === 1 ? 12 : parseInt(mes) - 1;
    const prevYear = parseInt(mes) === 1 ? parseInt(anio) - 1 : parseInt(anio);

    const prevClose = await prisma.commissionClose.findUnique({
      where: {
        userId_mes_anio: {
          userId: req.userId!,
          mes: prevMonth,
          anio: prevYear,
        },
      },
    });

    if (prevClose && prevClose.comisionBruta > 0) {
      crecimiento = ((comisionBruta - prevClose.comisionBruta) / prevClose.comisionBruta) * 100;
    }

    const close = await prisma.commissionClose.create({
      data: {
        userId: req.userId!,
        mes: parseInt(mes),
        anio: parseInt(anio),
        totalPrima,
        comisionBruta,
        crecimiento,
      },
    });

    res.status(201).json(close);
  } catch (error) {
    console.error("Close commission error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Export commissions to Excel
commissionsRouter.get("/export", async (req: AuthRequest, res: Response) => {
  try {
    const closes = await prisma.commissionClose.findMany({
      where: { userId: req.userId },
      orderBy: [{ anio: "desc" }, { mes: "desc" }],
    });

    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    const data = closes.map((c: any) => ({
      Mes: `${meses[c.mes - 1]} ${c.anio}`,
      "Total Prima": c.totalPrima,
      "Comisión Bruta": c.comisionBruta,
      "Crecimiento %": c.crecimiento != null ? `${c.crecimiento.toFixed(1)}%` : "-",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Comisiones");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=Comisiones_PAS_Alert.xlsx");
    res.send(buffer);
  } catch (error) {
    console.error("Export commissions error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});
