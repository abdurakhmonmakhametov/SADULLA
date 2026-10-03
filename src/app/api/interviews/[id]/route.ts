import { NextResponse } from "next/server";
import { readBody } from "@/lib/api";
import { interviewSchema } from "@/lib/schemas";
import { mutate } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import type { Interview } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = await readBody(req, interviewSchema);
  if (!body.ok) return body.response;
  if (body.data.id !== id) return NextResponse.json({ error: "ID mos emas." }, { status: 400 });

  const found = await mutate((d) => {
    const idx = d.interviews.findIndex((i) => i.id === id && i.userId === auth.user.id);
    if (idx === -1) return false;
    d.interviews[idx] = { ...(body.data as Interview), userId: auth.user.id };
    return true;
  });
  if (!found) return NextResponse.json({ error: "Suhbat topilmadi." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  await mutate((d) => {
    d.interviews = d.interviews.filter((i) => !(i.id === id && i.userId === auth.user.id));
  });
  return NextResponse.json({ ok: true });
}
