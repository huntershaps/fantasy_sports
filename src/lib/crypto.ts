import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/** AES-256-GCM. The stored format is iv:tag:ciphertext, all base64url, so a
 *  value carries everything needed to decrypt it except the key. */

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

function key(): Buffer {
  const raw = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY is not set. Run `node scripts/gen-secrets.mjs`.",
    );
  }
  const buffer = Buffer.from(raw, "base64");
  if (buffer.length !== 32) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  }
  return buffer;
}

export function encryptJson(value: unknown): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(":");
}

export function decryptJson<T>(stored: string): T {
  const [ivPart, tagPart, dataPart] = stored.split(":");
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error("Stored credential is malformed.");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    key(),
    Buffer.from(ivPart, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}

/** Shows enough of a secret to confirm which one is stored, without exposing
 *  it. Never send the full value to the browser. */
export function maskSecret(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 8) return "••••";
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
}
