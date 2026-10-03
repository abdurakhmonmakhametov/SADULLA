import { NextResponse } from "next/server";
import { resolveAi } from "@/lib/ai/client";
import { PROVIDERS } from "@/lib/ai/providers";
import { getCurrentUser } from "@/lib/server/auth";
import { speechStatus } from "@/lib/server/tts";

export const dynamic = "force-dynamic";

export async function GET() {
  const ai = resolveAi(await getCurrentUser());
  return NextResponse.json({ ai: Boolean(ai), aiProvider: ai ? PROVIDERS[ai.provider].label : null, ...speechStatus() });
}
