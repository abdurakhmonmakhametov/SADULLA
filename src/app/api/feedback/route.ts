import { NextResponse } from "next/server";
import { readBody } from "@/lib/api";
import { requireUser } from "@/lib/server/auth";
import { feedbackRequest } from "@/lib/schemas";
import { createReport } from "@/lib/ai/service";
import { resolveAi } from "@/lib/ai/client";

export const maxDuration = 300;

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const body = await readBody(req, feedbackRequest);
  if (!body.ok) return body.response;
  const { data, source, notice } = await createReport(resolveAi(auth.user), body.data.config, body.data.items);
  return NextResponse.json({ report: data, source, notice });
}
