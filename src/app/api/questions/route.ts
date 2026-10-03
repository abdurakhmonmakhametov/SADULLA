import { NextResponse } from "next/server";
import { readBody } from "@/lib/api";
import { requireUser } from "@/lib/server/auth";
import { questionsRequest } from "@/lib/schemas";
import { createQuestions } from "@/lib/ai/service";
import { resolveAi } from "@/lib/ai/client";

export const maxDuration = 120;

export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const body = await readBody(req, questionsRequest);
  if (!body.ok) return body.response;
  const { data, source, notice } = await createQuestions(resolveAi(auth.user), body.data.config);
  return NextResponse.json({ questions: data, source, notice });
}
