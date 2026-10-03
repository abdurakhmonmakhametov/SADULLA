import { NextResponse } from "next/server";
import { readBody } from "@/lib/api";
import { resolveAi } from "@/lib/ai/client";
import { coachReply } from "@/lib/ai/service";
import { coachRequest } from "@/lib/schemas";
import { requireUser } from "@/lib/server/auth";

export const maxDuration = 120;

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const body = await readBody(req, coachRequest);
  if (!body.ok) return body.response;
  const { data, source, notice } = await coachReply(resolveAi(auth.user), body.data.messages, body.data.context);
  return NextResponse.json({ reply: data, source, notice });
}
