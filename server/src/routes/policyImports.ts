import { Router, Response, NextFunction } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import { checkPlanLimit } from "../middleware/planLimits.js";
import { getQuotaTotalFromVigencia } from "../lib/generalPolicies.js";
import {
  extractPolicyDataFromText,
  extractTextFromPdf,
  PolicyImportData,
} from "../lib/policyPdfExtractor.js";
import {
  deletePolicyDocumentPdf,
  getPolicyDocumentMaxBytes,
  readPolicyDocumentPdf,
  storePolicyDocumentPdf,
  validatePolicyPdfUpload,
} from "../lib/policyDocumentStorage.js";
import {
  buildFirstCascadeQuotaData,
  buildPolicyWriteData,
  PolicyPayload,
} from "./policies.js";

export const policyImportsRouter = Router();

function uploadMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: getPolicyDocumentMaxBytes(), files: 20 },
  });
  upload.array("files", 20)(req, res, (error: any) => {
    if (!error) {
      next();
      return;
    }
    if (error?.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ error: "pdf_too_large", message: "Uno de los PDF supera el tamaño máximo permitido." });
      return;
    }
    res.status(400).json({ error: "invalid_pdf", message: "No se pudieron procesar los archivos PDF." });
  });
}

const requiredKeys: Array<{ key: keyof PolicyImportData; label: string }> = [
  { key: "aseguradora", label: "Compañía aseguradora" },
  { key: "rubro", label: "Rubro" },
  { key: "numeroPoliza", label: "Número de póliza" },
  { key: "fechaInicio", label: "Vigencia desde" },
  { key: "fechaVencimiento", label: "Vigencia hasta" },
  { key: "clienteNombre", label: "Asegurado" },
  { key: "clienteDni", label: "DNI/CUIT" },
  { key: "cobertura", label: "Cobertura" },
];

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
}

function normalizeImportData(input: any): PolicyImportData {
  const prima = asNumber(input?.prima);
  const premioTotal = asNumber(input?.premioTotal);
  return {
    clienteNombre: asString(input?.clienteNombre),
    clienteDni: asString(input?.clienteDni)?.replace(/\D/g, "") || asString(input?.clienteDni),
    clienteTelefono: asString(input?.clienteTelefono),
    clienteEmail: asString(input?.clienteEmail),
    clienteDireccion: asString(input?.clienteDireccion),
    aseguradora: asString(input?.aseguradora),
    rubro: asString(input?.rubro),
    numeroPoliza: asString(input?.numeroPoliza),
    endoso: asString(input?.endoso),
    fechaInicio: isIsoDate(input?.fechaInicio) ? input.fechaInicio : undefined,
    fechaVencimiento: isIsoDate(input?.fechaVencimiento) ? input.fechaVencimiento : undefined,
    medioPago: asString(input?.medioPago) || "Cupon",
    vigencia: input?.vigencia,
    prima: prima ?? premioTotal,
    premioTotal,
    porcentajeComision: asNumber(input?.porcentajeComision) ?? 15,
    moneda: input?.moneda === "USD" || input?.moneda === "EUR" || input?.moneda === "BRL" ? input.moneda : "ARS",
    cobertura: asString(input?.cobertura),
    patente: asString(input?.patente),
    chasis: asString(input?.chasis),
    motor: asString(input?.motor),
    direccionRiesgo: asString(input?.direccionRiesgo),
    cuotas: Array.isArray(input?.cuotas) ? input.cuotas : [],
  };
}

function validateCandidateData(data: PolicyImportData): { foundFields: string[]; missingFields: string[]; warnings: string[] } {
  const foundFields = requiredKeys.filter(({ key }) => Boolean(data[key])).map(({ label }) => label);
  const missingFields = requiredKeys.filter(({ key }) => !data[key]).map(({ label }) => label);
  if (!data.prima && !data.premioTotal) missingFields.push("Prima o premio total");
  else foundFields.push(data.prima ? "Prima" : "Premio total");

  const warnings: string[] = [];
  if (!data.clienteTelefono) warnings.push("Teléfono no detectado; se guardará vacío si no lo completás.");
  if (!data.clienteEmail) warnings.push("Email no detectado; se guardará vacío si no lo completás.");
  if (!data.cuotas?.length) warnings.push("No se detectaron cuotas en formato legible.");
  return { foundFields, missingFields, warnings };
}

function candidateStatus(missingFields: string[]) {
  return missingFields.length ? "INCOMPLETE" : "READY";
}

function serializeCandidate(candidate: any) {
  return {
    id: candidate.id,
    batchId: candidate.batchId,
    documentId: candidate.documentId,
    status: candidate.status,
    data: candidate.data,
    foundFields: candidate.foundFields,
    missingFields: candidate.missingFields,
    warnings: candidate.warnings,
    policyId: candidate.policyId,
    policyGroupId: candidate.policyGroupId,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  };
}

function serializeBatch(batch: any) {
  return {
    id: batch.id,
    status: batch.status,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
    documents: (batch.documents || []).map((document: any) => ({
      id: document.id,
      originalName: document.originalName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      status: document.status,
      error: document.error,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    })),
    candidates: (batch.candidates || []).map(serializeCandidate),
  };
}

async function getDirectoryInsurers(userId: string): Promise<string[]> {
  const insurers = await prisma.insuranceCompany.findMany({
    where: { userId },
    select: { razonSocial: true },
  });
  return insurers.map((insurer) => insurer.razonSocial).filter(Boolean);
}

async function refreshBatchStatus(batchId: string) {
  const candidates = await prisma.policyImportCandidate.findMany({
    where: { batchId },
    select: { status: true },
  });
  const documents = await prisma.policyImportDocument.findMany({
    where: { batchId },
    select: { status: true },
  });
  const status =
    documents.every((document) => document.status === "FAILED") ? "FAILED"
      : candidates.some((candidate) => candidate.status === "INCOMPLETE") ? "INCOMPLETE"
      : candidates.some((candidate) => candidate.status === "READY") ? "READY"
      : candidates.length && candidates.every((candidate) => candidate.status === "CONFIRMED") ? "CONFIRMED"
      : "PROCESSING";
  return prisma.policyImportBatch.update({ where: { id: batchId }, data: { status } });
}

policyImportsRouter.post("/", uploadMiddleware, async (req: AuthRequest, res: Response) => {
  const files = (req.files || []) as Express.Multer.File[];
  if (!files.length) {
    res.status(400).json({ error: "missing_files", message: "Seleccioná al menos un PDF." });
    return;
  }

  try {
    for (const file of files) validatePolicyPdfUpload(file);

    const directoryInsurers = await getDirectoryInsurers(req.userId!);
    const batch = await prisma.policyImportBatch.create({
      data: { userId: req.userId!, status: "PROCESSING" },
    });

    for (const file of files) {
      const storageKey = await storePolicyDocumentPdf(file.buffer);
      const document = await prisma.policyImportDocument.create({
        data: {
          batchId: batch.id,
          userId: req.userId!,
          originalName: file.originalname.trim().slice(0, 255) || "poliza.pdf",
          storageKey,
          mimeType: "application/pdf",
          sizeBytes: file.size,
          status: "PROCESSING",
        },
      });

      try {
        const text = await extractTextFromPdf(file.buffer);
        const extraction = extractPolicyDataFromText(text, directoryInsurers);
        const status = candidateStatus(extraction.missingFields);
        await prisma.policyImportCandidate.create({
          data: {
            batchId: batch.id,
            documentId: document.id,
            userId: req.userId!,
            status,
            data: extraction.data as any,
            foundFields: extraction.foundFields as any,
            missingFields: extraction.missingFields as any,
            warnings: extraction.warnings as any,
          },
        });
        await prisma.policyImportDocument.update({
          where: { id: document.id },
          data: {
            status,
            extractedText: extraction.text.slice(0, 100_000),
            error: null,
          },
        });
      } catch (error: any) {
        await prisma.policyImportDocument.update({
          where: { id: document.id },
          data: {
            status: "FAILED",
            error: String(error?.message || "No se pudo leer automáticamente; completá los datos manualmente.").slice(0, 1000),
          },
        });
        await prisma.policyImportCandidate.create({
          data: {
            batchId: batch.id,
            documentId: document.id,
            userId: req.userId!,
            status: "INCOMPLETE",
            data: { medioPago: "Cupon", porcentajeComision: 15, moneda: "ARS" },
            foundFields: [],
            missingFields: requiredKeys.map((field) => field.label).concat("Prima o premio total"),
            warnings: ["No se pudo leer automáticamente; completá los datos manualmente."],
          },
        });
      }
    }

    await refreshBatchStatus(batch.id);
    const fullBatch = await prisma.policyImportBatch.findFirst({
      where: { id: batch.id, userId: req.userId! },
      include: { documents: { orderBy: { createdAt: "asc" } }, candidates: { orderBy: { createdAt: "asc" } } },
    });
    res.status(201).json({ batch: serializeBatch(fullBatch) });
  } catch (error: any) {
    const code = error?.message;
    if (code === "invalid_pdf" || code === "pdf_too_large") {
      res.status(code === "pdf_too_large" ? 413 : 400).json({
        error: code,
        message: code === "pdf_too_large" ? "Uno de los PDF supera el tamaño máximo permitido." : "Todos los archivos deben ser PDF válidos.",
      });
      return;
    }
    console.error("Create policy import error:", error);
    res.status(500).json({ error: "internal_error", message: "No se pudo importar la póliza." });
  }
});

policyImportsRouter.get("/:batchId", async (req: AuthRequest, res: Response) => {
  try {
    const batch = await prisma.policyImportBatch.findFirst({
      where: { id: req.params.batchId, userId: req.userId! },
      include: { documents: { orderBy: { createdAt: "asc" } }, candidates: { orderBy: { createdAt: "asc" } } },
    });
    if (!batch) {
      res.status(404).json({ error: "batch_not_found", message: "Importación no encontrada." });
      return;
    }
    res.json({ batch: serializeBatch(batch) });
  } catch (error) {
    console.error("Get policy import error:", error);
    res.status(500).json({ error: "internal_error", message: "No se pudo consultar la importación." });
  }
});

policyImportsRouter.post("/candidates/:id/confirm", async (req: AuthRequest, res: Response) => {
  let newPolicyDocumentStorageKey: string | null = null;
  try {
    const candidate = await prisma.policyImportCandidate.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      include: { document: true },
    });
    if (!candidate) {
      res.status(404).json({ error: "candidate_not_found", message: "Borrador de póliza no encontrado." });
      return;
    }
    if (candidate.status === "CONFIRMED") {
      res.status(409).json({ error: "already_confirmed", message: "Esta póliza ya fue confirmada." });
      return;
    }

    const data = normalizeImportData(req.body?.data || req.body);
    const validation = validateCandidateData(data);
    if (validation.missingFields.length) {
      await prisma.policyImportCandidate.update({
        where: { id: candidate.id },
        data: {
          status: "INCOMPLETE",
          data: data as any,
          foundFields: validation.foundFields as any,
          missingFields: validation.missingFields as any,
          warnings: validation.warnings as any,
        },
      });
      res.status(400).json({ error: "missing_required_fields", missingFields: validation.missingFields, warnings: validation.warnings });
      return;
    }

    const limitCheck = await checkPlanLimit(req.userId!, "polizas");
    if (!limitCheck.allowed) {
      res.status(403).json({ error: limitCheck.message });
      return;
    }

    const originalPdf = await readPolicyDocumentPdf(candidate.document.storageKey);
    newPolicyDocumentStorageKey = await storePolicyDocumentPdf(originalPdf);
    const groupId = randomUUID();
    const payload: PolicyPayload = {
      ...data,
      clienteTelefono: data.clienteTelefono || "",
      clienteEmail: data.clienteEmail || "",
      medioPago: data.medioPago || "Cupon",
      porcentajeComision: data.porcentajeComision ?? 15,
      prima: data.prima ?? data.premioTotal ?? 0,
      groupId,
      cuotaActual: 1,
      cuotaTotal: data.vigencia ? getQuotaTotalFromVigencia(data.vigencia) : undefined,
    };

    const result = await prisma.$transaction(async (tx) => {
      const writeData = await buildPolicyWriteData(tx, req.userId!, payload);
      const quotaTotal = getQuotaTotalFromVigencia(writeData.vigencia);
      const firstQuota = buildFirstCascadeQuotaData(
        {
          ...writeData,
          cuotaTotal: quotaTotal,
          groupId,
        },
        quotaTotal,
        groupId
      );
      const policy = await tx.policy.create({
        data: { userId: req.userId!, ...firstQuota },
      });
      await tx.policyDocument.upsert({
        where: { userId_policyGroupId: { userId: req.userId!, policyGroupId: groupId } },
        create: {
          userId: req.userId!,
          policyGroupId: groupId,
          originalName: candidate.document.originalName,
          storageKey: newPolicyDocumentStorageKey!,
          mimeType: "application/pdf",
          sizeBytes: originalPdf.length,
        },
        update: {
          originalName: candidate.document.originalName,
          storageKey: newPolicyDocumentStorageKey!,
          mimeType: "application/pdf",
          sizeBytes: originalPdf.length,
        },
      });
      const updatedCandidate = await tx.policyImportCandidate.update({
        where: { id: candidate.id },
        data: {
          status: "CONFIRMED",
          data: data as any,
          foundFields: validation.foundFields as any,
          missingFields: [],
          warnings: validation.warnings as any,
          policyId: policy.id,
          policyGroupId: groupId,
        },
      });
      return { policy, candidate: updatedCandidate };
    });

    newPolicyDocumentStorageKey = null;
    await refreshBatchStatus(candidate.batchId);
    res.status(201).json({ policy: result.policy, candidate: serializeCandidate(result.candidate) });
  } catch (error: any) {
    if (newPolicyDocumentStorageKey) await deletePolicyDocumentPdf(newPolicyDocumentStorageKey);
    const message = error instanceof Error ? error.message : "No se pudo confirmar la póliza.";
    console.error("Confirm policy import candidate error:", error);
    res.status(message === "Campos obligatorios faltantes" ? 400 : 500).json({ error: message });
  }
});
