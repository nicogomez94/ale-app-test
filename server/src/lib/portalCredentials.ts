import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getSecretKey(): Buffer {
  const secret = process.env.PORTAL_CREDENTIAL_SECRET;
  if (!secret || secret.trim().length < 16) {
    throw new Error("PORTAL_CREDENTIAL_SECRET debe estar configurado para guardar credenciales de portal");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptPortalPassword(password: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getSecretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv, tag, encrypted].map((part) => part.toString("base64")).join(":");
}

export function decryptPortalPassword(payload: string): string {
  const [ivRaw, tagRaw, encryptedRaw] = payload.split(":");
  if (!ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error("Credencial almacenada invalida");
  }

  const decipher = createDecipheriv(ALGORITHM, getSecretKey(), Buffer.from(ivRaw, "base64"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
