import { NextResponse } from "next/server";
import { readBody } from "@/lib/api";
import { interviewSchema } from "@/lib/schemas";
import { mutate, read } from "@/lib/server/db";
import { requireUser } from "@/lib/server/auth";
import type { Interview } from "@/lib/types";

export const dynamic = "force-dynamic";

function strip(stored: Interview & { userId?: string }): Interview {
  const copy = { ...stored };
  delete copy.userId;
  return copy;
}

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const list = await read((d) =>
    d.interviews.filter((i) => i.userId === auth.user.id).sort((a, b) => b.createdAt - a.createdAt).map(strip),
  );
  return NextResponse.json({ interviews: list });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const body = await readBody(req, interviewSchema);
  if (!body.ok) return body.response;
  const created = await mutate((d) => {
    if (d.interviews.some((i) => i.id === body.data.id)) return false;
    d.interviews.push({ ...(body.data as Interview), userId: auth.user.id });
    return true;
  });
  if (!created) return NextResponse.json({ error: "Bu ID band." }, { status: 409 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
