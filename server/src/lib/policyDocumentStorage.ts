import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;

export function getPolicyDocumentStorageDir(): string {
  return path.resolve(process.env.POLICY_DOCUMENT_STORAGE_DIR || path.join(process.cwd(), "storage", "policy-documents"));
}

export function getPolicyDocumentMaxBytes(): number {
  const configured = Number(process.env.POLICY_DOCUMENT_MAX_BYTES);
  return Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_MAX_BYTES;
}

export function validatePolicyPdfUpload(file: { originalname: string; mimetype: string; buffer: Buffer; size: number }): void {
  const extension = path.extname(file.originalname).toLowerCase();
  if (extension !== ".pdf" || file.mimetype !== "application/pdf") {
    throw new Error("invalid_pdf");
  }
  if (file.size <= 0 || file.size > getPolicyDocumentMaxBytes()) {
    throw new Error(file.size > getPolicyDocumentMaxBytes() ? "pdf_too_large" : "invalid_pdf");
  }
  if (file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("invalid_pdf");
  }
}

export function getPolicyDocumentFilePath(storageKey: string): string {
  if (!/^[0-9a-f-]+\.pdf$/i.test(storageKey) || path.basename(storageKey) !== storageKey) {
    throw new Error("invalid_storage_key");
  }
  return path.join(getPolicyDocumentStorageDir(), storageKey);
}

export async function storePolicyDocumentPdf(buffer: Buffer): Promise<string> {
  await mkdir(getPolicyDocumentStorageDir(), { recursive: true });
  const storageKey = `${randomUUID()}.pdf`;
  await writeFile(getPolicyDocumentFilePath(storageKey), buffer, { flag: "wx", mode: 0o600 });
  return storageKey;
}

export async function readPolicyDocumentPdf(storageKey: string): Promise<Buffer> {
  return readFile(getPolicyDocumentFilePath(storageKey));
}

export async function deletePolicyDocumentPdf(storageKey: string): Promise<boolean> {
  try {
    await unlink(getPolicyDocumentFilePath(storageKey));
    return true;
  } catch (error: any) {
    if (error?.code === "ENOENT") return true;
    console.error(`[PolicyDocumentStorage] No se pudo eliminar ${storageKey}:`, error);
    return false;
  }
}
