import crypto from "crypto";

const ENCRYPTION_KEY = process.env.PAYMENT_SECRET_KEY || "pharmabiz-payment-secret-key-32b!"; // 32 bytes
const IV_LENGTH = 16;

export function encryptSecret(text: string): string {
  if (!text || text.startsWith("enc:")) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32), "utf8");
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `enc:${iv.toString("hex")}:${encrypted}`;
}

export function decryptSecret(encryptedText: string): string {
  if (!encryptedText || !encryptedText.startsWith("enc:")) return encryptedText;
  try {
    const parts = encryptedText.split(":");
    if (parts.length < 3) return encryptedText;
    const [, ivHex, dataHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32), "utf8");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(dataHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("[decryptSecret] Error decrypting secret:", err);
    return encryptedText;
  }
}

export function maskSecret(secret: string | null | undefined): string {
  if (!secret) return "";
  return "••••••••••••••••";
}

export function isMasked(value: string | null | undefined): boolean {
  return value === "••••••••••••••••";
}
