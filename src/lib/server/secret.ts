import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * AES-256-GCM for secrets stored in the JSON database (users' AI API keys).
 * The key comes from APP_SECRET, or a random secret generated once and kept
 * in a file next to the database (outside git).
 */

const g = globalThis as typeof globalThis & { __suhbatdoshKey?: Buffer };

function masterKey(): Buffer {
  if (g.__suhbatdoshKey) return g.__suhbatdoshKey;
  let secret = process.env.APP_SECRET;
  if (!secret) {
    const dataFile = process.env.DATA_FILE || path.join(process.cwd(), "data", "db.json");
    const file = path.join(path.dirname(dataFile), ".secret");
    if (existsSync(file)) {
      secret = readFileSync(file, "utf8").trim();
    } else {
      secret = randomBytes(32).toString("hex");
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, secret, { encoding: "utf8", mode: 0o600 });
    }
  }
  g.__suhbatdoshKey = createHash("sha256").update(secret).digest();
  return g.__suhbatdoshKey;
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(".");
}

export function decrypt(token: string): string | null {
  try {
    const [v, iv, tag, data] = token.split(".");
    if (v !== "v1") return null;
    const decipher = createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
