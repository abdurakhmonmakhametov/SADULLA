import { NextResponse } from "next/server";
import { readBody } from "@/lib/api";
import { requireUser } from "@/lib/server/auth";
import { followUpRequest } from "@/lib/schemas";
import { createFollowUp } from "@/lib/ai/service";
import { resolveAi } from "@/lib/ai/client";

export const maxDuration = 60;

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const body = await readBody(req, followUpRequest);
  if (!body.ok) return body.response;
  const { config, question, answer, upcoming } = body.data;
  const { data, source } = await createFollowUp(resolveAi(auth.user), config, question, answer, upcoming);
  return NextResponse.json({ followUp: data, source });
}
