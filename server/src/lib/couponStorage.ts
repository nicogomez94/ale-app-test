import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000;

export function getCouponStorageDir(): string {
  return path.resolve(process.env.COUPON_STORAGE_DIR || path.join(process.cwd(), "storage", "coupons"));
}

export function getCouponMaxBytes(): number {
  const configured = Number(process.env.COUPON_MAX_BYTES);
  return Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_MAX_BYTES;
}

export function validatePdfUpload(file: { originalname: string; mimetype: string; buffer: Buffer; size: number }): void {
  const extension = path.extname(file.originalname).toLowerCase();
  if (extension !== ".pdf" || file.mimetype !== "application/pdf") {
    throw new Error("invalid_pdf");
  }
  if (file.size <= 0 || file.size > getCouponMaxBytes()) {
    throw new Error(file.size > getCouponMaxBytes() ? "pdf_too_large" : "invalid_pdf");
  }
  if (file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("invalid_pdf");
  }
}

export function getCouponFilePath(storageKey: string): string {
  if (!/^[0-9a-f-]+\.pdf$/i.test(storageKey) || path.basename(storageKey) !== storageKey) {
    throw new Error("invalid_storage_key");
  }
  return path.join(getCouponStorageDir(), storageKey);
}

export async function storeCouponPdf(buffer: Buffer): Promise<string> {
  await mkdir(getCouponStorageDir(), { recursive: true });
  const storageKey = `${randomUUID()}.pdf`;
  await writeFile(getCouponFilePath(storageKey), buffer, { flag: "wx", mode: 0o600 });
  return storageKey;
}

export async function readCouponPdf(storageKey: string): Promise<Buffer> {
  return readFile(getCouponFilePath(storageKey));
}

export async function deleteCouponPdf(storageKey: string): Promise<boolean> {
  try {
    await unlink(getCouponFilePath(storageKey));
    return true;
  } catch (error: any) {
    if (error?.code === "ENOENT") return true;
    console.error(`[CouponStorage] No se pudo eliminar ${storageKey}:`, error);
    return false;
  }
}

export async function cleanupOrphanCouponFiles(referencedKeys: Set<string>, now = Date.now()): Promise<number> {
  await mkdir(getCouponStorageDir(), { recursive: true });
  const entries = await readdir(getCouponStorageDir(), { withFileTypes: true });
  let deleted = 0;

  for (const entry of entries) {
    if (!entry.isFile() || !/^[0-9a-f-]+\.pdf$/i.test(entry.name) || referencedKeys.has(entry.name)) continue;
    const filePath = getCouponFilePath(entry.name);
    const fileStat = await stat(filePath);
    if (now - fileStat.mtimeMs < ORPHAN_GRACE_MS) continue;
    if (await deleteCouponPdf(entry.name)) deleted++;
  }

  return deleted;
}
