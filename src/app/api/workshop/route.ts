import { NextResponse } from "next/server";
import { readBody } from "@/lib/api";
import { resolveAi } from "@/lib/ai/client";
import { reviewAnswer } from "@/lib/ai/service";
import { workshopRequest } from "@/lib/schemas";
import { requireUser } from "@/lib/server/auth";

export const maxDuration = 120;

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const body = await readBody(req, workshopRequest);
  if (!body.ok) return body.response;
  const { data, source, notice } = await reviewAnswer(resolveAi(auth.user), body.data);
  return NextResponse.json({ result: data, source, notice });
}
