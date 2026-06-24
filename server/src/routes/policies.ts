import { CompanyType, CurrencyType, InteractionChannel, PolicyType, PolicyVigencia, Prisma } from "@prisma/client";
import { Router, Response } from "express";
import { randomUUID } from "crypto";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { checkPlanLimit } from "../middleware/planLimits.js";
import {
  classifyPolicyTypeFromRubro,
  getQuotaTotalFromVigencia,
  inferVigenciaFromDates,
  mapRubroToCompanyType,
} from "../lib/generalPolicies.js";

export const policiesRouter = Router();
policiesRouter.use(authMiddleware);

const policyInclude = {
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
} satisfies Prisma.PolicyInclude;

type PolicyPayload = {
  clienteId?: string | null;
  companyId?: string | null;
  clienteNombre?: string;
  clienteDni?: string | null;
  clienteTelefono?: string | null;
  clienteEmail?: string | null;
  clienteDireccion?: string | null;
  clienteAltura?: string | null;
  clienteCp?: string | null;
  clienteProvincia?: string | null;
  clienteLocalidad?: string | null;
  aseguradora?: string;
  rubro?: string;
  numeroPoliza?: string;
  fechaInicio?: string;
  fechaVencimiento?: string;
  medioPago?: string | null;
  vigencia?: PolicyVigencia | string | null;
  cuotaActual?: number | string | null;
  cuotaTotal?: number | string | null;
  groupId?: string | null;
  pagada?: boolean;
  fechaPago?: string | null;
  prima?: number | string;
  porcentajeComision?: number | string;
  moneda?: string | null;
  tipo?: PolicyType | string | null;
};

function computeStatus(fechaVencimiento: Date): PolicyStatus {
  const now = new Date();
  const diff = fechaVencimiento.getTime() - now.getTime();
  const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return "VENCIDA";
  if (daysLeft <= 30) return "VENCE_PRONTO";
  return "ACTIVA";
}

type PolicyStatus = "ACTIVA" | "VENCE_PRONTO" | "VENCIDA";

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function asNullableString(value: unknown): string | null {
  return asTrimmedString(value) ?? null;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asInteger(value: unknown): number | undefined {
  const parsed = asNumber(value);
  if (parsed == null) return undefined;
  return Math.trunc(parsed);
}

function asDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const maxDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, maxDay));
  return result;
}

function normalizeVigencia(value: unknown, fechaInicio: Date, fechaVencimiento: Date): PolicyVigencia {
  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase();
    if (
      normalized === "MENSUAL" ||
      normalized === "BIMESTRAL" ||
      normalized === "TRIMESTRAL" ||
      normalized === "SEMESTRAL" ||
      normalized === "ANUAL"
    ) {
      return normalized as PolicyVigencia;
    }
  }
  return inferVigenciaFromDates(fechaInicio, fechaVencimiento);
}

function normalizePolicyType(value: unknown, rubro: string): PolicyType {
  if (value === "INDIVIDUAL" || value === "EMPRESA") {
    return value;
  }
  return classifyPolicyTypeFromRubro(rubro);
}

function buildClientData(input: PolicyPayload) {
  return {
    nombre: asTrimmedString(input.clienteNombre) || "",
    dni: asTrimmedString(input.clienteDni) || "",
    telefono: asTrimmedString(input.clienteTelefono) || "",
    email: asTrimmedString(input.clienteEmail) || "",
    direccion: asNullableString(input.clienteDireccion),
    altura: asNullableString(input.clienteAltura),
    cp: asNullableString(input.clienteCp),
    provincia: asNullableString(input.clienteProvincia),
    localidad: asNullableString(input.clienteLocalidad),
  };
}

function buildCompanyData(input: PolicyPayload, companyType: CompanyType) {
  return {
    razonSocial: asTrimmedString(input.clienteNombre) || "",
    cuit: asTrimmedString(input.clienteDni) || "",
    ramo: asNullableString(input.rubro),
    aseguradora: asTrimmedString(input.aseguradora) || "",
    email: asTrimmedString(input.clienteEmail) || "",
    telefono: asTrimmedString(input.clienteTelefono) || "",
    direccion: asNullableString(input.clienteDireccion),
    altura: asNullableString(input.clienteAltura),
    cp: asNullableString(input.clienteCp),
    provincia: asNullableString(input.clienteProvincia),
    localidad: asNullableString(input.clienteLocalidad),
    tipo: companyType,
  };
}

async function ensureClientLink(
  tx: Prisma.TransactionClient,
  userId: string,
  input: PolicyPayload,
  existingPolicy?: { clienteId: string | null }
): Promise<{ clienteId: string; companyId: null }> {
  const data = buildClientData(input);
  let client = null;

  if (existingPolicy?.clienteId) {
    client = await tx.client.findFirst({ where: { id: existingPolicy.clienteId, userId } });
  }

  if (!client && input.clienteId) {
    client = await tx.client.findFirst({ where: { id: input.clienteId, userId } });
  }

  if (!client && data.dni) {
    client = await tx.client.findFirst({ where: { userId, dni: data.dni } });
  }

  if (!client && data.email) {
    client = await tx.client.findFirst({ where: { userId, email: data.email } });
  }

  if (!client && data.nombre) {
    client = await tx.client.findFirst({ where: { userId, nombre: data.nombre } });
  }

  if (client) {
    const updated = await tx.client.update({
      where: { id: client.id },
      data,
    });
    return { clienteId: updated.id, companyId: null };
  }

  const limitCheck = await checkPlanLimit(userId, "clientes");
  if (!limitCheck.allowed) {
    throw new Error(limitCheck.message || "No se pudo crear el cliente vinculado");
  }

  const created = await tx.client.create({
    data: {
      userId,
      ...data,
    },
  });

  return { clienteId: created.id, companyId: null };
}

async function ensureCompanyLink(
  tx: Prisma.TransactionClient,
  userId: string,
  input: PolicyPayload,
  existingPolicy?: { companyId: string | null }
): Promise<{ clienteId: null; companyId: string }> {
  const companyType = mapRubroToCompanyType(asTrimmedString(input.rubro) || "") || "INTEGRAL_DE_COMERCIO";
  const data = buildCompanyData(input, companyType);
  let company = null;

  if (existingPolicy?.companyId) {
    company = await tx.company.findFirst({ where: { id: existingPolicy.companyId, userId } });
  }

  if (!company && input.companyId) {
    company = await tx.company.findFirst({ where: { id: input.companyId, userId } });
  }

  if (!company && data.cuit) {
    company = await tx.company.findFirst({ where: { userId, cuit: data.cuit } });
  }

  if (!company && data.razonSocial) {
    company = await tx.company.findFirst({ where: { userId, razonSocial: data.razonSocial } });
  }

  if (company) {
    const updated = await tx.company.update({
      where: { id: company.id },
      data,
    });
    return { clienteId: null, companyId: updated.id };
  }

  const limitCheck = await checkPlanLimit(userId, "empresas");
  if (!limitCheck.allowed) {
    throw new Error(limitCheck.message || "No se pudo crear la empresa vinculada");
  }

  const created = await tx.company.create({
    data: {
      userId,
      ...data,
    },
  });

  return { clienteId: null, companyId: created.id };
}

async function buildPolicyWriteData(
  tx: Prisma.TransactionClient,
  userId: string,
  input: PolicyPayload,
  existingPolicy?: {
    id: string;
    clienteId: string | null;
    companyId: string | null;
    fechaVencimiento: Date;
    comisionCalculada: number;
    vigencia: PolicyVigencia;
    cuotaActual: number;
    cuotaTotal: number;
    groupId: string | null;
    pagada: boolean;
    fechaPago: Date | null;
  }
) {
  const clienteNombre = asTrimmedString(input.clienteNombre);
  const clienteDni = asNullableString(input.clienteDni);
  const clienteTelefono = asNullableString(input.clienteTelefono);
  const clienteEmail = asTrimmedString(input.clienteEmail);
  const rubro = asTrimmedString(input.rubro);
  const aseguradora = asTrimmedString(input.aseguradora);
  const numeroPoliza = asTrimmedString(input.numeroPoliza);
  const fechaInicio = asDate(input.fechaInicio);
  const fechaVencimiento = asDate(input.fechaVencimiento);
  const prima = asNumber(input.prima);
  const porcentajeComision = asNumber(input.porcentajeComision);

  if (
    !clienteNombre ||
    !clienteDni ||
    !clienteTelefono ||
    !clienteEmail ||
    !rubro ||
    !aseguradora ||
    !numeroPoliza ||
    !fechaInicio ||
    !fechaVencimiento ||
    prima == null ||
    porcentajeComision == null
  ) {
    throw new Error("Campos obligatorios faltantes");
  }

  const tipo = normalizePolicyType(input.tipo, rubro);
  const vigencia = normalizeVigencia(input.vigencia, fechaInicio, fechaVencimiento);
  const cuotaActual = Math.max(1, asInteger(input.cuotaActual) ?? existingPolicy?.cuotaActual ?? 1);
  const cuotaTotal = Math.max(
    cuotaActual,
    asInteger(input.cuotaTotal) ?? existingPolicy?.cuotaTotal ?? getQuotaTotalFromVigencia(vigencia)
  );
  const pagada = existingPolicy?.pagada ?? false;
  const fechaPago = existingPolicy?.fechaPago ?? null;
  const link =
    tipo === "INDIVIDUAL"
      ? await ensureClientLink(tx, userId, input, existingPolicy)
      : await ensureCompanyLink(tx, userId, input, existingPolicy);
  const comisionCalculada = parseFloat((prima * (porcentajeComision / 100)).toFixed(2));
  const estado = computeStatus(fechaVencimiento);
  const shouldResetReminderFlags =
    !!existingPolicy && existingPolicy.fechaVencimiento.getTime() !== fechaVencimiento.getTime();

  return {
    clienteId: link.clienteId,
    companyId: link.companyId,
    clienteNombre,
    clienteDni,
    clienteTelefono,
    clienteEmail,
    aseguradora,
    rubro,
    numeroPoliza,
    fechaInicio,
    fechaVencimiento,
    medioPago: asNullableString(input.medioPago),
    vigencia,
    cuotaActual,
    cuotaTotal,
    groupId: existingPolicy?.groupId || existingPolicy?.id || asTrimmedString(input.groupId) || null,
    pagada,
    fechaPago,
    ...(shouldResetReminderFlags
      ? {
          recordatorioProximoEnviadoAt: null,
          recordatorioVencidaEnviadoAt: null,
        }
      : {}),
    prima,
    porcentajeComision,
    moneda: (input.moneda === "USD" || input.moneda === "EUR" || input.moneda === "BRL") ? input.moneda as CurrencyType : CurrencyType.ARS,
    comisionCalculada,
    estado,
    tipo,
  };
}

export function buildQuotaSeriesData(baseData: any, quotaTotal: number, groupId: string) {
  const total = Math.max(1, quotaTotal);
  const start = new Date(baseData.fechaInicio);
  const finalEnd = new Date(baseData.fechaVencimiento);

  return Array.from({ length: total }, (_, index) => {
    const cuotaActual = index + 1;
    const fechaInicio = index === 0 ? start : addMonths(start, index);
    const fechaVencimiento = cuotaActual === total ? finalEnd : addMonths(start, cuotaActual);

    return {
      ...baseData,
      fechaInicio,
      fechaVencimiento,
      estado: computeStatus(fechaVencimiento),
      cuotaActual,
      cuotaTotal: total,
      groupId,
      pagada: false,
      fechaPago: null,
      renewalGeneratedAt: null,
      renewalGroupId: null,
      recordatorioProximoEnviadoAt: null,
      recordatorioVencidaEnviadoAt: null,
      ultimaGestionTipo: null,
      ultimaGestionFecha: null,
      ultimaGestionWhatsappCount: 0,
      ultimaGestionMailCount: 0,
    };
  });
}

function buildNextCascadeQuotaData(source: any, groupStartDate: Date) {
  const nextQuota = Math.min(source.cuotaActual + 1, source.cuotaTotal);
  const fechaInicio = new Date(source.fechaVencimiento);
  const fechaVencimiento = addMonths(groupStartDate, nextQuota);

  return {
    clienteId: source.clienteId,
    companyId: source.companyId,
    clienteNombre: source.clienteNombre,
    clienteDni: source.clienteDni,
    clienteTelefono: source.clienteTelefono,
    clienteEmail: source.clienteEmail,
    aseguradora: source.aseguradora,
    rubro: source.rubro,
    numeroPoliza: source.numeroPoliza,
    fechaInicio,
    fechaVencimiento,
    medioPago: source.medioPago,
    vigencia: source.vigencia,
    cuotaActual: nextQuota,
    cuotaTotal: source.cuotaTotal,
    groupId: source.groupId || source.id,
    pagada: false,
    fechaPago: null,
    prima: source.prima,
    porcentajeComision: source.porcentajeComision,
    moneda: source.moneda,
    comisionCalculada: source.comisionCalculada,
    estado: computeStatus(fechaVencimiento),
    tipo: source.tipo,
    renewalGeneratedAt: null,
    renewalGroupId: null,
    recordatorioProximoEnviadoAt: null,
    recordatorioVencidaEnviadoAt: null,
    ultimaGestionTipo: null,
    ultimaGestionFecha: null,
    ultimaGestionWhatsappCount: 0,
    ultimaGestionMailCount: 0,
  };
}

function buildRenewalBaseData(source: any, groupId: string) {
  const quotaTotal = getQuotaTotalFromVigencia(source.vigencia);
  const fechaInicio = new Date(source.fechaVencimiento);
  const fechaVencimiento = addMonths(fechaInicio, quotaTotal);

  return {
    clienteId: source.clienteId,
    companyId: source.companyId,
    clienteNombre: source.clienteNombre,
    clienteDni: source.clienteDni,
    clienteTelefono: source.clienteTelefono,
    clienteEmail: source.clienteEmail,
    aseguradora: source.aseguradora,
    rubro: source.rubro,
    numeroPoliza: source.numeroPoliza,
    fechaInicio,
    fechaVencimiento,
    medioPago: source.medioPago,
    vigencia: source.vigencia,
    cuotaActual: 1,
    cuotaTotal: quotaTotal,
    groupId,
    pagada: false,
    fechaPago: null,
    prima: source.prima,
    porcentajeComision: source.porcentajeComision,
    moneda: source.moneda,
    comisionCalculada: source.comisionCalculada,
    estado: computeStatus(fechaVencimiento),
    tipo: source.tipo,
  };
}

// List policies
policiesRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { tipo, estado, rubro, search } = req.query;
    const where: Prisma.PolicyWhereInput = { userId: req.userId };

    if (tipo === "INDIVIDUAL" || tipo === "EMPRESA") where.tipo = tipo;
    if (estado === "ACTIVA" || estado === "VENCE_PRONTO" || estado === "VENCIDA") where.estado = estado;
    if (typeof rubro === "string" && rubro.trim()) where.rubro = rubro.trim();
    if (typeof search === "string" && search.trim()) {
      where.OR = [
        { clienteNombre: { contains: search.trim(), mode: "insensitive" } },
        { numeroPoliza: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const policies = await prisma.policy.findMany({
      where,
      orderBy: { fechaVencimiento: "asc" },
      include: policyInclude,
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
    const input = req.body as PolicyPayload;

    const limitCheck = await checkPlanLimit(req.userId!, "polizas");
    if (!limitCheck.allowed) {
      res.status(403).json({ error: limitCheck.message });
      return;
    }

    const policies = await prisma.$transaction(async (tx) => {
      const data = await buildPolicyWriteData(tx, req.userId!, input);
      const quotaTotal = getQuotaTotalFromVigencia(data.vigencia);
      const groupId = randomUUID();
      const quotaRows = buildQuotaSeriesData(
        {
          ...data,
          cuotaTotal: quotaTotal,
          groupId,
        },
        quotaTotal,
        groupId
      );

      const created = [];
      for (const row of quotaRows) {
        created.push(await tx.policy.create({
          data: { userId: req.userId!, ...row },
          include: policyInclude,
        }));
      }
      return created;
    });

    res.status(201).json({
      ...policies[0],
      generatedCount: policies.length,
      generatedPolicies: policies,
    });
  } catch (error) {
    console.error("Create policy error:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    res.status(message === "Campos obligatorios faltantes" ? 400 : 500).json({ error: message });
  }
});

// Update policy
policiesRouter.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const input = req.body as PolicyPayload;

    const existing = await prisma.policy.findFirst({
      where: { id, userId: req.userId },
      select: {
        id: true,
        clienteId: true,
        companyId: true,
        fechaVencimiento: true,
        comisionCalculada: true,
        vigencia: true,
        cuotaActual: true,
        cuotaTotal: true,
        groupId: true,
        pagada: true,
        fechaPago: true,
      },
    });

    if (!existing) {
      res.status(404).json({ error: "Póliza no encontrada" });
      return;
    }

    const policy = await prisma.$transaction(async (tx) => {
      const data = await buildPolicyWriteData(tx, req.userId!, input, existing);
      return tx.policy.update({
        where: { id },
        data,
        include: policyInclude,
      });
    });

    res.json(policy);
  } catch (error) {
    console.error("Update policy error:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    res.status(message === "Campos obligatorios faltantes" ? 400 : 500).json({ error: message });
  }
});

// Update payment status
policiesRouter.patch("/:id/payment", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.policy.findFirst({
      where: { id, userId: req.userId },
      include: policyInclude,
    });

    if (!existing) {
      res.status(404).json({ error: "Póliza no encontrada" });
      return;
    }

    const pagada = typeof req.body?.pagada === "boolean" ? req.body.pagada : !existing.pagada;
    const fechaPago = pagada ? asDate(req.body?.fechaPago) || existing.fechaPago || new Date() : null;

    let renewalCreated = false;
    let renewalPolicies: any[] = [];
    let nextQuotaCreated = false;
    let nextQuotaPolicies: any[] = [];

    const policy = await prisma.$transaction(async (tx) => {
      const updatedPolicy = await tx.policy.update({
        where: { id },
        data: {
          pagada,
          fechaPago,
        },
        include: policyInclude,
      });

      const isLastQuota = existing.cuotaActual === existing.cuotaTotal;
      if (!pagada) {
        return updatedPolicy;
      }

      if (!isLastQuota) {
        const groupId = existing.groupId || existing.id;
        const existingNext = await tx.policy.findFirst({
          where: {
            userId: req.userId!,
            groupId,
            cuotaActual: existing.cuotaActual + 1,
          },
          include: policyInclude,
        });

        if (existingNext) {
          nextQuotaPolicies = [existingNext];
          return updatedPolicy;
        }

        const firstQuota = await tx.policy.findFirst({
          where: { userId: req.userId!, groupId },
          orderBy: { cuotaActual: "asc" },
        });
        const groupStartDate = firstQuota?.fechaInicio || existing.fechaInicio;
        const nextData = buildNextCascadeQuotaData({ ...existing, groupId }, groupStartDate);
        const createdNext = await tx.policy.create({
          data: {
            userId: req.userId!,
            ...nextData,
          },
          include: policyInclude,
        });
        nextQuotaPolicies = [createdNext];
        nextQuotaCreated = true;
        return updatedPolicy;
      }

      if (existing.renewalGroupId) {
        renewalPolicies = await tx.policy.findMany({
          where: { userId: req.userId!, groupId: existing.renewalGroupId },
          orderBy: { cuotaActual: "asc" },
          include: policyInclude,
        });
        return updatedPolicy;
      }

      const renewalGroupId = randomUUID();
      const claim = await tx.policy.updateMany({
        where: { id, userId: req.userId!, renewalGroupId: null },
        data: { renewalGeneratedAt: new Date(), renewalGroupId },
      });

      if (claim.count === 0) {
        const source = await tx.policy.findFirst({
          where: { id, userId: req.userId! },
          select: { renewalGroupId: true },
        });
        if (source?.renewalGroupId) {
          renewalPolicies = await tx.policy.findMany({
            where: { userId: req.userId!, groupId: source.renewalGroupId },
            orderBy: { cuotaActual: "asc" },
            include: policyInclude,
          });
        }
        return updatedPolicy;
      }

      const baseData = buildRenewalBaseData(existing, renewalGroupId);
      const renewalRows = buildQuotaSeriesData(baseData, baseData.cuotaTotal, renewalGroupId);
      for (const row of renewalRows) {
        renewalPolicies.push(await tx.policy.create({
          data: { userId: req.userId!, ...row },
          include: policyInclude,
        }));
      }

      renewalCreated = renewalPolicies.length > 0;
      return updatedPolicy;
    });

    res.json({ policy, renewalCreated, renewalPolicies, nextQuotaCreated, nextQuotaPolicies });
  } catch (error) {
    console.error("Update payment error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Track WhatsApp / Email interactions
policiesRouter.post("/:id/interactions", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const channel = req.body?.channel;

    if (channel !== "WHATSAPP" && channel !== "EMAIL") {
      res.status(400).json({ error: "Canal inválido" });
      return;
    }

    const existing = await prisma.policy.findFirst({
      where: { id, userId: req.userId },
      select: { id: true },
    });

    if (!existing) {
      res.status(404).json({ error: "Póliza no encontrada" });
      return;
    }

    const policy = await prisma.policy.update({
      where: { id },
      data: {
        ultimaGestionTipo: channel as InteractionChannel,
        ultimaGestionFecha: new Date(),
        ultimaGestionWhatsappCount: channel === "WHATSAPP" ? { increment: 1 } : undefined,
        ultimaGestionMailCount: channel === "EMAIL" ? { increment: 1 } : undefined,
      },
      include: policyInclude,
    });

    res.json(policy);
  } catch (error) {
    console.error("Track interaction error:", error);
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
      select: { id: true, fechaVencimiento: true, estado: true },
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
