import { CompanyType, CurrencyType, InteractionChannel, PolicyType, PolicyVigencia, Prisma } from "@prisma/client";
import { Router, Response, NextFunction } from "express";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import multer from "multer";
import prisma from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { checkPlanLimit } from "../middleware/planLimits.js";
import {
  classifyPolicyTypeFromRubro,
  getQuotaTotalFromVigencia,
  inferVigenciaFromDates,
  mapRubroToCompanyType,
} from "../lib/generalPolicies.js";
import {
  deleteCouponPdf,
  getCouponMaxBytes,
  readCouponPdf,
  storeCouponPdf,
  validatePdfUpload,
} from "../lib/couponStorage.js";
import { deletePolicyDocumentPdf } from "../lib/policyDocumentStorage.js";
import {
  normalizeWhatsAppPhone,
  sendCouponTemplate,
  WhatsAppNotConfiguredError,
} from "../lib/whatsapp.js";
import { sendEmail } from "../lib/email.js";

export const policiesRouter = Router();
export const publicCouponsRouter = Router();
policiesRouter.use(authMiddleware);

function couponUploadMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const couponUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: getCouponMaxBytes() },
  });
  couponUpload.single("file")(req, res, (error: any) => {
    if (!error) {
      next();
      return;
    }
    if (error?.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ error: "pdf_too_large", message: "El PDF supera el tamaño máximo permitido." });
      return;
    }
    res.status(400).json({ error: "invalid_pdf", message: "No se pudo procesar el archivo PDF." });
  });
}

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

export type PolicyPayload = {
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
  premioTotal?: number | string | null;
  cobertura?: string | null;
  endoso?: string | null;
  patente?: string | null;
  chasis?: string | null;
  motor?: string | null;
  direccionRiesgo?: string | null;
  porcentajeComision?: number | string;
  moneda?: string | null;
  tipo?: PolicyType | string | null;
};

function computeStatus(fechaVencimiento: Date): PolicyStatus {
  const now = new Date();
  const diff = fechaVencimiento.getTime() - now.getTime();
  const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return "VENCIDA";
  if (daysLeft <= 7) return "VENCE_PRONTO";
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

export async function buildPolicyWriteData(
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
  const clienteEmail = asTrimmedString(input.clienteEmail) || "";
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
    premioTotal: asNumber(input.premioTotal) ?? null,
    cobertura: asNullableString(input.cobertura),
    endoso: asNullableString(input.endoso),
    patente: asNullableString(input.patente),
    chasis: asNullableString(input.chasis),
    motor: asNullableString(input.motor),
    direccionRiesgo: asNullableString(input.direccionRiesgo),
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

export function buildFirstCascadeQuotaData(baseData: any, quotaTotal: number, groupId: string) {
  return buildQuotaSeriesData(baseData, quotaTotal, groupId)[0];
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
    premioTotal: source.premioTotal,
    cobertura: source.cobertura,
    endoso: source.endoso,
    patente: source.patente,
    chasis: source.chasis,
    motor: source.motor,
    direccionRiesgo: source.direccionRiesgo,
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
    premioTotal: source.premioTotal,
    cobertura: source.cobertura,
    endoso: source.endoso,
    patente: source.patente,
    chasis: source.chasis,
    motor: source.motor,
    direccionRiesgo: source.direccionRiesgo,
    porcentajeComision: source.porcentajeComision,
    moneda: source.moneda,
    comisionCalculada: source.comisionCalculada,
    estado: computeStatus(fechaVencimiento),
    tipo: source.tipo,
  };
}

function getPolicyGroupId(policy: { id: string; groupId: string | null }): string {
  return policy.groupId || policy.id;
}

function getPolicyGroupWhere(policy: { id: string; groupId: string | null }, userId: string): Prisma.PolicyWhereInput {
  return policy.groupId ? { userId, groupId: policy.groupId } : { userId, id: policy.id };
}

function serializeDelivery(delivery: any) {
  if (!delivery) return null;
  return {
    id: delivery.id,
    status: delivery.status,
    recipient: delivery.recipient,
    errorMessage: delivery.errorMessage,
    createdAt: delivery.createdAt,
    updatedAt: delivery.updatedAt,
  };
}

function serializeCoupon(coupon: any) {
  if (!coupon) return null;
  return {
    id: coupon.id,
    originalName: coupon.originalName,
    mimeType: coupon.mimeType,
    sizeBytes: coupon.sizeBytes,
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
    lastDelivery: serializeDelivery(coupon.deliveries?.[0]),
  };
}

async function findOwnedPolicy(policyId: string, userId: string) {
  return prisma.policy.findFirst({
    where: { id: policyId, userId },
    include: {
      cliente: { select: { telefono: true, email: true } },
      company: { select: { telefono: true, email: true } },
      user: { select: { nombre: true, email: true } },
    },
  });
}

async function findCouponForPolicy(policy: { id: string; groupId: string | null; userId: string }) {
  return prisma.policyCoupon.findUnique({
    where: {
      userId_policyGroupId: {
        userId: policy.userId,
        policyGroupId: getPolicyGroupId(policy),
      },
    },
    include: { deliveries: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
}

function couponLinkSecret(): string {
  return process.env.COUPON_LINK_SECRET || process.env.JWT_SECRET || process.env.WHATSAPP_APP_SECRET || "";
}

function signCouponLink(couponId: string, expires: number): string {
  return createHmac("sha256", couponLinkSecret()).update(`${couponId}:${expires}`).digest("hex");
}

publicCouponsRouter.get("/:id", async (req, res) => {
  try {
    const expires = Number(req.query.expires || 0);
    const token = String(req.query.token || "");
    const secret = couponLinkSecret();
    if (!secret || !Number.isFinite(expires) || expires < Date.now() || expires > Date.now() + 8 * 24 * 60 * 60 * 1000) {
      res.status(403).json({ error: "invalid_coupon_link", message: "El enlace del cupón venció o no es válido." });
      return;
    }
    const expected = signCouponLink(req.params.id, expires);
    const valid = token.length === expected.length && timingSafeEqual(Buffer.from(token), Buffer.from(expected));
    if (!valid) {
      res.status(403).json({ error: "invalid_coupon_link", message: "El enlace del cupón no es válido." });
      return;
    }
    const coupon = await prisma.policyCoupon.findUnique({ where: { id: req.params.id } });
    if (!coupon) { res.status(404).json({ error: "coupon_not_found", message: "Cupón no encontrado." }); return; }
    const file = await readCouponPdf(coupon.storageKey);
    const asciiName = coupon.originalName.replace(/[^a-zA-Z0-9._-]/g, "_") || "cupon.pdf";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Disposition", `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(coupon.originalName)}`);
    res.send(file);
  } catch (error) {
    console.error("Public coupon download error:", error);
    res.status(500).json({ error: "coupon_download_failed", message: "No se pudo descargar el cupón." });
  }
});

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

    const policy = await prisma.$transaction(async (tx) => {
      const data = await buildPolicyWriteData(tx, req.userId!, input);
      const quotaTotal = getQuotaTotalFromVigencia(data.vigencia);
      const groupId = randomUUID();
      const firstQuota = buildFirstCascadeQuotaData(
        {
          ...data,
          cuotaTotal: quotaTotal,
          groupId,
        },
        quotaTotal,
        groupId
      );
      return tx.policy.create({
        data: { userId: req.userId!, ...firstQuota },
        include: policyInclude,
      });
    });

    res.status(201).json({
      ...policy,
      generatedCount: 1,
      generatedPolicies: [policy],
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
      const firstRenewalQuota = buildFirstCascadeQuotaData(baseData, baseData.cuotaTotal, renewalGroupId);
      renewalPolicies.push(await tx.policy.create({
        data: { userId: req.userId!, ...firstRenewalQuota },
        include: policyInclude,
      }));

      renewalCreated = renewalPolicies.length > 0;
      return updatedPolicy;
    });

    res.json({ policy, renewalCreated, renewalPolicies, nextQuotaCreated, nextQuotaPolicies });
  } catch (error) {
    console.error("Update payment error:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Policy coupon metadata
policiesRouter.get("/:id/coupon", async (req: AuthRequest, res: Response) => {
  try {
    const policy = await findOwnedPolicy(req.params.id, req.userId!);
    if (!policy) {
      res.status(404).json({ error: "policy_not_found", message: "Póliza no encontrada." });
      return;
    }
    const coupon = await findCouponForPolicy(policy);
    res.json({ coupon: serializeCoupon(coupon) });
  } catch (error) {
    console.error("Get policy coupon error:", error);
    res.status(500).json({ error: "internal_error", message: "No se pudo consultar la cuponera." });
  }
});

// Upload or replace the shared PDF for a policy group
policiesRouter.post("/:id/coupon", couponUploadMiddleware, async (req: AuthRequest, res: Response) => {
  let newStorageKey: string | null = null;
  try {
    const policy = await findOwnedPolicy(req.params.id, req.userId!);
    if (!policy) {
      res.status(404).json({ error: "policy_not_found", message: "Póliza no encontrada." });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "invalid_pdf", message: "Seleccioná un archivo PDF." });
      return;
    }
    validatePdfUpload(req.file);

    const policyGroupId = getPolicyGroupId(policy);
    const previous = await prisma.policyCoupon.findUnique({
      where: { userId_policyGroupId: { userId: req.userId!, policyGroupId } },
    });
    newStorageKey = await storeCouponPdf(req.file.buffer);

    const coupon = await prisma.policyCoupon.upsert({
      where: { userId_policyGroupId: { userId: req.userId!, policyGroupId } },
      create: {
        userId: req.userId!,
        policyGroupId,
        originalName: req.file.originalname.trim().slice(0, 255) || "cuponera.pdf",
        storageKey: newStorageKey,
        mimeType: "application/pdf",
        sizeBytes: req.file.size,
      },
      update: {
        originalName: req.file.originalname.trim().slice(0, 255) || "cuponera.pdf",
        storageKey: newStorageKey,
        mimeType: "application/pdf",
        sizeBytes: req.file.size,
      },
      include: { deliveries: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    if (previous?.storageKey && previous.storageKey !== newStorageKey) {
      await deleteCouponPdf(previous.storageKey);
    }
    res.status(previous ? 200 : 201).json({ coupon: serializeCoupon(coupon) });
  } catch (error: any) {
    if (newStorageKey) await deleteCouponPdf(newStorageKey);
    const code = error?.message;
    if (code === "invalid_pdf" || code === "pdf_too_large") {
      res.status(code === "pdf_too_large" ? 413 : 400).json({
        error: code,
        message: code === "pdf_too_large" ? "El PDF supera el tamaño máximo permitido." : "El archivo no es un PDF válido.",
      });
      return;
    }
    console.error("Upload policy coupon error:", error);
    res.status(500).json({ error: "internal_error", message: "No se pudo guardar la cuponera." });
  }
});

policiesRouter.get("/:id/coupon/download", async (req: AuthRequest, res: Response) => {
  try {
    const policy = await findOwnedPolicy(req.params.id, req.userId!);
    if (!policy) {
      res.status(404).json({ error: "policy_not_found", message: "Póliza no encontrada." });
      return;
    }
    const coupon = await findCouponForPolicy(policy);
    if (!coupon) {
      res.status(404).json({ error: "coupon_not_found", message: "La póliza no tiene una cuponera asociada." });
      return;
    }
    const file = await readCouponPdf(coupon.storageKey);
    const asciiName = coupon.originalName.replace(/[^a-zA-Z0-9._-]/g, "_") || "cuponera.pdf";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", String(file.length));
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(coupon.originalName)}`
    );
    res.send(file);
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      res.status(410).json({ error: "coupon_file_missing", message: "El archivo de la cuponera ya no está disponible." });
      return;
    }
    console.error("Download policy coupon error:", error);
    res.status(500).json({ error: "internal_error", message: "No se pudo descargar la cuponera." });
  }
});

policiesRouter.delete("/:id/coupon", async (req: AuthRequest, res: Response) => {
  try {
    const policy = await findOwnedPolicy(req.params.id, req.userId!);
    if (!policy) {
      res.status(404).json({ error: "policy_not_found", message: "Póliza no encontrada." });
      return;
    }
    const coupon = await findCouponForPolicy(policy);
    if (!coupon) {
      res.status(404).json({ error: "coupon_not_found", message: "La póliza no tiene una cuponera asociada." });
      return;
    }
    await prisma.policyCoupon.delete({ where: { id: coupon.id } });
    await deleteCouponPdf(coupon.storageKey);
    res.json({ message: "Cuponera eliminada." });
  } catch (error) {
    console.error("Delete policy coupon error:", error);
    res.status(500).json({ error: "internal_error", message: "No se pudo eliminar la cuponera." });
  }
});

policiesRouter.post("/:id/coupon/send-whatsapp", async (req: AuthRequest, res: Response) => {
  try {
    const policy = await findOwnedPolicy(req.params.id, req.userId!);
    if (!policy) {
      res.status(404).json({ error: "policy_not_found", message: "Póliza no encontrada." });
      return;
    }
    const coupon = await findCouponForPolicy(policy);
    if (!coupon) {
      res.status(409).json({ error: "coupon_not_found", message: "Cargá una cuponera antes de enviar por WhatsApp." });
      return;
    }

    const rawPhone = policy.clienteTelefono || policy.cliente?.telefono || policy.company?.telefono || "";
    let recipient: string;
    try {
      recipient = normalizeWhatsAppPhone(rawPhone);
    } catch {
      await prisma.whatsAppCouponDelivery.create({
        data: {
          couponId: coupon.id,
          userId: req.userId!,
          policyId: policy.id,
          recipient: rawPhone.trim(),
          status: "FAILED",
          errorCode: "invalid_phone",
          errorMessage: "El teléfono del cliente no es válido para WhatsApp.",
        },
      });
      res.status(400).json({ error: "invalid_phone", message: "Revisá el teléfono del cliente antes de enviar." });
      return;
    }

    try {
      const document = await readCouponPdf(coupon.storageKey);
      const dueDate = new Intl.DateTimeFormat("es-AR", { timeZone: "UTC" }).format(policy.fechaVencimiento);
      const result = await sendCouponTemplate({
        recipient,
        document,
        filename: `cuponera-${policy.numeroPoliza.replace(/[^a-zA-Z0-9._-]/g, "-")}.pdf`,
        clientName: policy.clienteNombre,
        policyNumber: policy.numeroPoliza,
        insurer: policy.aseguradora,
        dueDate,
        producerName: policy.user.nombre,
      });

      const delivery = await prisma.$transaction(async (tx) => {
        const created = await tx.whatsAppCouponDelivery.create({
          data: {
            couponId: coupon.id,
            userId: req.userId!,
            policyId: policy.id,
            recipient,
            metaMessageId: result.messageId,
            status: "ACCEPTED",
          },
        });
        await tx.policy.update({
          where: { id: policy.id },
          data: {
            ultimaGestionTipo: "WHATSAPP",
            ultimaGestionFecha: new Date(),
            ultimaGestionWhatsappCount: { increment: 1 },
          },
        });
        return created;
      });

      res.status(202).json({ delivery: serializeDelivery(delivery) });
    } catch (error: any) {
      const notConfigured = error instanceof WhatsAppNotConfiguredError;
      const errorCode = notConfigured ? "whatsapp_not_configured" : String(error?.code || "whatsapp_send_failed");
      const errorMessage = notConfigured
        ? "WhatsApp todavía no está configurado en el servidor."
        : String(error?.message || "Meta rechazó el envío.").slice(0, 1000);
      await prisma.whatsAppCouponDelivery.create({
        data: {
          couponId: coupon.id,
          userId: req.userId!,
          policyId: policy.id,
          recipient,
          status: "FAILED",
          errorCode,
          errorMessage,
        },
      });
      res.status(notConfigured ? 503 : 502).json({ error: errorCode, message: errorMessage });
    }
  } catch (error) {
    console.error("Send coupon WhatsApp error:", error);
    res.status(500).json({ error: "internal_error", message: "No se pudo iniciar el envío por WhatsApp." });
  }
});

policiesRouter.post("/:id/coupon/send-email", async (req: AuthRequest, res: Response) => {
  try {
    const policy = await findOwnedPolicy(req.params.id, req.userId!);
    if (!policy) { res.status(404).json({ error: "policy_not_found", message: "Póliza no encontrada." }); return; }
    const coupon = await findCouponForPolicy(policy);
    if (!coupon) { res.status(409).json({ error: "coupon_not_found", message: "Cargá una cuponera antes de enviarla por correo." }); return; }
    const recipient = (policy.clienteEmail || policy.cliente?.email || policy.company?.email || "").trim();
    if (!recipient) { res.status(400).json({ error: "email_not_found", message: "El cliente no tiene un correo electrónico cargado." }); return; }
    const secret = couponLinkSecret();
    if (!secret) { res.status(503).json({ error: "coupon_link_not_configured", message: "Falta configurar COUPON_LINK_SECRET o JWT_SECRET." }); return; }
    const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const token = signCouponLink(coupon.id, expires);
    const baseUrl = (process.env.SYSTEM_APP_URL || process.env.APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
    const downloadUrl = `${baseUrl}/api/public/coupons/${coupon.id}?expires=${expires}&token=${token}`;
    await sendEmail({
      name: policy.user.nombre || "PAS Alert",
      email: policy.user.email || recipient,
      to: recipient,
      message: `Hola ${policy.clienteNombre},\n\nTe enviamos el cupón de pago de la póliza N.º ${policy.numeroPoliza} de ${policy.aseguradora}.\n\nDescargar cupón: ${downloadUrl}\n\nEl enlace estará disponible durante 7 días.\n\nSaludos,\n${policy.user.nombre || "PAS Alert"}`,
    });
    await prisma.policy.update({ where: { id: policy.id }, data: { ultimaGestionTipo: "EMAIL", ultimaGestionFecha: new Date(), ultimaGestionMailCount: { increment: 1 } } });
    res.status(202).json({ message: "Cupón enviado por correo electrónico.", recipient });
  } catch (error: any) {
    console.error("Send coupon email error:", error);
    res.status(502).json({ error: "coupon_email_failed", message: error?.message || "No se pudo enviar el cupón por correo." });
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

    const policyGroupId = getPolicyGroupId(existing);
    const coupon = await prisma.policyCoupon.findUnique({
      where: { userId_policyGroupId: { userId: req.userId!, policyGroupId } },
    });
    const policyDocument = await prisma.policyDocument.findUnique({
      where: { userId_policyGroupId: { userId: req.userId!, policyGroupId } },
    });
    const deleted = await prisma.$transaction(async (tx) => {
      if (coupon) await tx.policyCoupon.delete({ where: { id: coupon.id } });
      if (policyDocument) await tx.policyDocument.delete({ where: { id: policyDocument.id } });
      return tx.policy.deleteMany({ where: getPolicyGroupWhere(existing, req.userId!) });
    });
    if (coupon) await deleteCouponPdf(coupon.storageKey);
    if (policyDocument) await deletePolicyDocumentPdf(policyDocument.storageKey);
    res.json({ message: "Póliza y cuotas asociadas eliminadas", deletedCount: deleted.count });
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
