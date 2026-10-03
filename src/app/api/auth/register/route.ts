import { NextResponse } from "next/server";
import { readBody } from "@/lib/api";
import { registerRequest } from "@/lib/schemas";
import { mutate } from "@/lib/server/db";
import { createSession, hashPassword, newUserId, setSessionCookie, toPublic } from "@/lib/server/auth";

export async function POST(req: Request) {
  const body = await readBody(req, registerRequest);
  if (!body.ok) return body.response;
  const { name, email, password } = body.data;

  const passwordHash = await hashPassword(password);
  const user = await mutate((d) => {
    if (d.users.some((u) => u.email === email)) return null;
    const u = { id: newUserId(), name, email, passwordHash, createdAt: Date.now() };
    d.users.push(u);
    return u;
  });
  if (!user) {
    return NextResponse.json(
      { error: "Bu email bilan allaqachon ro‘yxatdan o‘tilgan.", field: "email" },
      { status: 409 },
    );
  }

  const { token, expiresAt } = await createSession(user.id);
  const res = NextResponse.json({ user: toPublic(user) }, { status: 201 });
  setSessionCookie(res, token, expiresAt);
  return res;
}
