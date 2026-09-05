import { Router, Response } from "express";
import prisma from "../lib/prisma.js";
import { argentinaCalendarDay, policyDaysRemaining } from '../lib/policyCalendar.js';
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { getVigenciaLabel } from "../lib/generalPolicies.js";
import { countPolicyGroups } from "../middleware/planLimits.js";

export const dashboardRouter = Router();
dashboardRouter.use(authMiddleware);

const dashboardPolicyInclude = {
  cliente: {
    select: {
      id: true,
      nombre: true,
      dni: true,
      telefono: true,
      email: true,
      direccion: true,
      altura: true,
      cp: true,
      provincia: true,
      localidad: true,
    },
  },
  company: {
    select: {
      id: true,
      razonSocial: true,
      cuit: true,
      telefono: true,
      email: true,
      direccion: true,
      altura: true,
      cp: true,
      provincia: true,
      localidad: true,
      tipo: true,
    },
  },
} as const;

// Get dashboard stats
dashboardRouter.get("/stats", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const now = new Date();
    const today = argentinaCalendarDay(now);
    const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      totalPolicyRows,
      activePolicyRows,
      expiredPolicyRows,
      expiringPolicyRows,
      totalClients,
      totalCompanies,
      clientPolicyRows,
      companyPolicyRows,
      lifePolicyCount,
      vidaPolicyCount,
      retiroPolicyCount,
      clientsWithBirthdays,
      unseenCotizaciones,
      pendingClaims,
      pendingCommissionInvoices,
      pendingImports,
      insurerCount,
      currentUser,
    ] = await Promise.all([
      prisma.policy.findMany({ where: { userId }, select: { id: true, groupId: true } }),
      prisma.policy.findMany({ where: { userId, estado: "ACTIVA", pagada: false }, select: { id: true, groupId: true } }),
      prisma.policy.findMany({ where: { userId, estado: "VENCIDA", pagada: false }, select: { id: true, groupId: true } }),
      prisma.policy.findMany({
        where: { userId, pagada: false, fechaVencimiento: { gte: today, lte: in7Days } },
        select: { id: true, groupId: true },
      }),
      prisma.client.count({ where: { userId } }),
      prisma.company.count({ where: { userId } }),
      prisma.policy.findMany({
        where: { userId, tipo: "INDIVIDUAL", estado: { not: "VENCIDA" } },
        select: { id: true, groupId: true },
      }),
      prisma.policy.findMany({
        where: { userId, tipo: "EMPRESA", estado: { not: "VENCIDA" } },
        select: { id: true, groupId: true },
      }),
      prisma.lifePolicy.count({ where: { userId } }),
      prisma.lifePolicy.count({ where: { userId, tipo: "VIDA" } }),
      prisma.lifePolicy.count({ where: { userId, tipo: "RETIRO" } }),
      prisma.client.findMany({ where: { userId, fechaNacimiento: { not: null } }, select: { fechaNacimiento: true } }),
      prisma.cotizacion.count({ where: { userId, viewedAt: null } }),
      prisma.siniestro.count({ where: { userId, estado: { notIn: ["PAGADO", "RECHAZADO"] } } }),
      prisma.commissionInvoice.count({ where: { userId, estado: { not: "COBRADA" } } }),
      prisma.policyImportCandidate.count({ where: { userId, status: { in: ["PROCESSING", "INCOMPLETE", "READY"] } } }),
      prisma.insuranceCompany.count({ where: { userId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { referidosMes: true } }),
    ]);

    const birthdayCount = clientsWithBirthdays.filter(({ fechaNacimiento }) => {
      if (!fechaNacimiento) return false;
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const next = new Date(start.getFullYear(), fechaNacimiento.getUTCMonth(), fechaNacimiento.getUTCDate());
      if (next < start) next.setFullYear(next.getFullYear() + 1);
      const startDay = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
      const nextDay = Date.UTC(next.getFullYear(), next.getMonth(), next.getDate());
      return Math.round((nextDay - startDay) / 86_400_000) <= 7;
    }).length;

    res.json({
      polizasActivas: countPolicyGroups(activePolicyRows),
      vencen7Dias: countPolicyGroups(expiringPolicyRows),
      polizasVencidas: countPolicyGroups(expiredPolicyRows),
      clientesTotales: totalClients + totalCompanies,
      totalPolizas: countPolicyGroups(totalPolicyRows),
      polizasClientes: countPolicyGroups(clientPolicyRows),
      polizasEmpresas: countPolicyGroups(companyPolicyRows),
      polizasVidaRetiro: lifePolicyCount,
      polizasVida: vidaPolicyCount,
      polizasRetiro: retiroPolicyCount,
      cumpleanos7Dias: birthdayCount,
      cotizacionesSinVer: unseenCotizaciones,
      siniestrosPendientes: pendingClaims,
      comisionesPendientes: pendingCommissionInvoices,
      importacionesPendientes: pendingImports,
      aseguradorasTotal: insurerCount,
      referidosMes: currentUser?.referidosMes || 0,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Get recent policies for dashboard tables
dashboardRouter.get("/policies", async (req: AuthRequest, res: Response) => {
  try {
    const { filter, rubro, limit } = req.query;
    const where: any = { userId: req.userId };
    const parsedLimit = Number(limit);
    const take = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;

    if (filter === "expiring") {
      const now = new Date();
      const today = argentinaCalendarDay(now);
      const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      where.fechaVencimiento = { gte: today, lte: in7Days };
      where.pagada = false;
    } else if (filter === "expired") {
      where.estado = "VENCIDA";
    } else if (filter === "active") {
      where.estado = "ACTIVA";
      where.pagada = false;
    }

    if (rubro) {
      where.rubro = rubro as string;
    }

    const policies = await prisma.policy.findMany({
      where,
      orderBy: { fechaVencimiento: "asc" },
      ...(take ? { take } : {}),
      include: dashboardPolicyInclude,
    });
    const policyGroupIds = Array.from(new Set(policies.map((policy) => policy.groupId || policy.id)));
    const coupons = policyGroupIds.length
      ? await prisma.policyCoupon.findMany({
          where: { userId: req.userId!, policyGroupId: { in: policyGroupIds } },
          include: { deliveries: { orderBy: { createdAt: "desc" }, take: 1 } },
        })
      : [];
    const couponsByGroup = new Map(coupons.map((coupon) => [coupon.policyGroupId, coupon]));
    const policyDocuments = policyGroupIds.length
      ? await prisma.policyDocument.findMany({
          where: { userId: req.userId!, policyGroupId: { in: policyGroupIds } },
        })
      : [];
    const policyDocumentsByGroup = new Map(policyDocuments.map((document) => [document.policyGroupId, document]));

    // Map to frontend format
    const mapped = policies.map((p: any) => {
      const daysLeft = policyDaysRemaining(p.fechaVencimiento);

      let estadoLabel = "Activa";
      if (daysLeft < 0) estadoLabel = "Vencida";
      else if (daysLeft <= 30) estadoLabel = "Vence pronto";
      const coupon = couponsByGroup.get(p.groupId || p.id);
      const policyDocument = policyDocumentsByGroup.get(p.groupId || p.id);
      const lastDelivery = coupon?.deliveries[0];

      return {
        id: p.id,
        clienteId: p.clienteId,
        companyId: p.companyId,
        cliente: p.company?.razonSocial || p.clienteNombre,
        clienteNombre: p.clienteNombre,
        clienteDni: p.clienteDni || p.cliente?.dni || p.company?.cuit || "",
        clienteTelefono: p.clienteTelefono || p.cliente?.telefono || p.company?.telefono || "",
        clienteEmail: p.clienteEmail || p.cliente?.email || p.company?.email || "",
        aseguradora: p.aseguradora,
        rubro: p.rubro,
        inicio: p.fechaInicio.toISOString().split("T")[0],
        vencimiento: p.fechaVencimiento.toISOString().split("T")[0],
        poliza: p.numeroPoliza,
        estado: daysLeft < 0 ? 'VENCIDA' : daysLeft <= 7 ? 'VENCE_PRONTO' : 'ACTIVA',
        estadoLabel,
        tipo: p.tipo,
        medioPago: p.medioPago,
        tipoUso: p.tipoUso,
        diasRestantes: daysLeft,
        telefono: p.clienteTelefono || p.cliente?.telefono || p.company?.telefono || "",
        email: p.clienteEmail || p.cliente?.email || p.company?.email || "",
        direccion: p.cliente?.direccion || p.company?.direccion || "",
        altura: p.cliente?.altura || p.company?.altura || "",
        cp: p.cliente?.cp || p.company?.cp || "",
        provincia: p.cliente?.provincia || p.company?.provincia || "",
        localidad: p.cliente?.localidad || p.company?.localidad || "",
        vigencia: p.vigencia,
        vigenciaLabel: getVigenciaLabel(p.vigencia),
        cuotaActual: p.cuotaActual,
        cuotaTotal: p.cuotaTotal,
        cuota: `${p.cuotaActual}/${p.cuotaTotal}`,
        groupId: p.groupId || p.id,
        pagada: p.pagada,
        fechaPago: p.fechaPago ? p.fechaPago.toISOString().split("T")[0] : "",
        prima: p.prima,
        premioTotal: p.premioTotal,
        cobertura: p.cobertura,
        endoso: p.endoso,
        patente: p.patente,
        chasis: p.chasis,
        motor: p.motor,
        direccionRiesgo: p.direccionRiesgo,
        porcentajeComision: p.porcentajeComision,
        moneda: (p as any).moneda ?? "ARS",
        comisionCalculada: p.comisionCalculada,
        coupon: coupon
          ? {
              id: coupon.id,
              originalName: coupon.originalName,
              mimeType: coupon.mimeType,
              sizeBytes: coupon.sizeBytes,
              createdAt: coupon.createdAt,
              updatedAt: coupon.updatedAt,
              lastDelivery: lastDelivery
                ? {
                    id: lastDelivery.id,
                    status: lastDelivery.status,
                    recipient: lastDelivery.recipient,
                    errorMessage: lastDelivery.errorMessage,
                    createdAt: lastDelivery.createdAt,
                    updatedAt: lastDelivery.updatedAt,
                  }
                : null,
            }
          : null,
        policyDocument: policyDocument
          ? {
              id: policyDocument.id,
              originalName: policyDocument.originalName,
              mimeType: policyDocument.mimeType,
              sizeBytes: policyDocument.sizeBytes,
              createdAt: policyDocument.createdAt,
              updatedAt: policyDocument.updatedAt,
            }
          : null,
        ultimaGestion:
          p.ultimaGestionTipo && p.ultimaGestionFecha
            ? {
                tipo: p.ultimaGestionTipo,
                fecha: p.ultimaGestionFecha.toISOString().split("T")[0],
                whatsappCount: p.ultimaGestionWhatsappCount,
                mailCount: p.ultimaGestionMailCount,
              }
            : null,
      };
    });

    res.json(mapped);
  } catch (error) {
    console.error("Dashboard policies error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Get alerts
dashboardRouter.get("/alerts", async (req: AuthRequest, res: Response) => {
  try {
    // Get upcoming expirations and recently expired policies as alerts
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const expiringPolicies = await prisma.policy.findMany({
      where: {
        userId: req.userId,
        estado: "VENCE_PRONTO",
      },
      orderBy: { fechaVencimiento: "asc" },
      take: 5,
    });

    const expiredPolicies = await prisma.policy.findMany({
      where: {
        userId: req.userId,
        estado: "VENCIDA",
      },
      orderBy: { fechaVencimiento: "desc" },
      take: 3,
    });

    const alerts: Array<{ id: string; type: string; message: string; date: string }> = [];

    for (const p of expiringPolicies) {
      const daysLeft = Math.ceil(
        (p.fechaVencimiento.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      alerts.push({
        id: p.id,
        type: "warning",
        message: `La póliza #${p.numeroPoliza} de ${p.clienteNombre} vence en ${daysLeft} días.`,
        date: p.fechaVencimiento.toISOString(),
      });
    }

    for (const p of expiredPolicies) {
      alerts.push({
        id: p.id,
        type: "error",
        message: `Póliza #${p.numeroPoliza} de ${p.clienteNombre} ha vencido.`,
        date: p.fechaVencimiento.toISOString(),
      });
    }

    // Get referral info for alert
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { referidosMes: true },
    });

    if (user && user.referidosMes > 0) {
      alerts.push({
        id: "referral",
        type: "info",
        message: `Tienes ${user.referidosMes} referido(s) este mes. ¡Sigue así!`,
        date: now.toISOString(),
      });
    }

    res.json(alerts);
  } catch (error) {
    console.error("Dashboard alerts error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});
