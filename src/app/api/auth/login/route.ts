import { NextResponse } from "next/server";
import { readBody } from "@/lib/api";
import { loginRequest } from "@/lib/schemas";
import { read } from "@/lib/server/db";
import {
  clearFailedLogins,
  createSession,
  loginBlocked,
  recordFailedLogin,
  setSessionCookie,
  toPublic,
  verifyPassword,
} from "@/lib/server/auth";

export async function POST(req: Request) {
  const body = await readBody(req, loginRequest);
  if (!body.ok) return body.response;
  const { email, password } = body.data;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${email}|${ip}`;
  if (loginBlocked(key)) {
    return NextResponse.json({ error: "Juda ko‘p urinish bo‘ldi. 15 daqiqadan so‘ng qayta urinib ko‘ring." }, { status: 429 });
  }

  const user = await read((d) => d.users.find((u) => u.email === email) ?? null);
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !ok) {
    recordFailedLogin(key);
    return NextResponse.json({ error: "Email yoki parol noto‘g‘ri." }, { status: 401 });
  }

  clearFailedLogins(key);
  const { token, expiresAt } = await createSession(user.id);
  const res = NextResponse.json({ user: toPublic(user) });
  setSessionCookie(res, token, expiresAt);
  return res;
}
