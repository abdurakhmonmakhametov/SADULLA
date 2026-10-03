import { NextResponse } from "next/server";
import { readBody } from "@/lib/api";
import { describeAiError, testConnection, type AiConfig } from "@/lib/ai/client";
import { PROVIDERS } from "@/lib/ai/providers";
import { aiSettingsRequest } from "@/lib/schemas";
import { requireUser } from "@/lib/server/auth";
import { decrypt } from "@/lib/server/secret";

export const maxDuration = 60;

/** Try the given settings (or the saved key, when apiKey is omitted) without saving. */
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const body = await readBody(req, aiSettingsRequest);
  if (!body.ok) return body.response;
  const { provider, model, apiKey, baseUrl } = body.data;
  const info = PROVIDERS[provider];
  const saved = auth.user.ai?.provider === provider && auth.user.ai.keyEnc ? decrypt(auth.user.ai.keyEnc) : null;
  const key = apiKey ?? saved ?? "";
  if (!key && !info.keyOptional) return NextResponse.json({ ok: false, message: "API kalitini kiriting." });
  if (provider === "custom" && !baseUrl) return NextResponse.json({ ok: false, message: "Server manzilini kiriting." });

  const ai: AiConfig = { provider, model, apiKey: key, baseUrl: provider === "custom" ? baseUrl! : info.baseUrl, source: "user" };
  const t0 = Date.now();
  try {
    const reply = await testConnection(ai);
    return NextResponse.json({ ok: true, message: reply.slice(0, 200), latencyMs: Date.now() - t0 });
  } catch (err) {
    console.error("[ai-test]", err);
    return NextResponse.json({ ok: false, message: describeAiError(err) });
  }
}
