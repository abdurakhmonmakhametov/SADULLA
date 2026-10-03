import "server-only";
import { createHash, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { mutate, read, type UserRecord } from "./db";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const SESSION_COOKIE = "rehearse_session";
const SESSION_DAYS = 30;

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: number;
}

export const toPublic = (u: UserRecord): PublicUser => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt });

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt:${salt.toString("base64")}:${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, saltB64, keyB64] = stored.split(":");
  if (algo !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function createSession(userId: string): Promise<{ token: string; expiresAt: number }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + SESSION_DAYS * 86_400_000;
  await mutate((d) => {
    d.sessions.push({ tokenHash: sha256(token), userId, expiresAt });
  });
  return { token, expiresAt };
}

export function setSessionCookie(res: NextResponse, token: string, expiresAt: number) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function destroySession(token: string | undefined) {
  if (!token) return;
  const h = sha256(token);
  await mutate((d) => {
    d.sessions = d.sessions.filter((s) => s.tokenHash !== h);
  });
}

/** The signed-in user for this request, or null. */
export async function getCurrentUser(): Promise<UserRecord | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const h = sha256(token);
  return read((d) => {
    const s = d.sessions.find((x) => x.tokenHash === h && x.expiresAt > Date.now());
    return s ? (d.users.find((u) => u.id === s.userId) ?? null) : null;
  });
}

/** For route handlers: the user, or a ready-made 401 response. */
export async function requireUser(): Promise<{ user: UserRecord } | { response: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) return { response: NextResponse.json({ error: "Avval tizimga kiring." }, { status: 401 }) };
  return { user };
}

export const newUserId = () => randomUUID();

/* Naive in-memory brute-force guard: 8 failed logins per email+IP per 15 minutes. */
const attempts = new Map<string, { count: number; until: number }>();
export function loginBlocked(key: string): boolean {
  const a = attempts.get(key);
  return !!a && a.count >= 8 && a.until > Date.now();
}
export function recordFailedLogin(key: string) {
  const a = attempts.get(key);
  const now = Date.now();
  if (!a || a.until < now) attempts.set(key, { count: 1, until: now + 15 * 60_000 });
  else a.count++;
}
export function clearFailedLogins(key: string) {
  attempts.delete(key);
}
