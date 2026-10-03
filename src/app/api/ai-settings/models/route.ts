import { NextResponse } from "next/server";
import { readBody } from "@/lib/api";
import { describeAiError, listModels, type AiConfig } from "@/lib/ai/client";
import { PROVIDERS } from "@/lib/ai/providers";
import { aiSettingsRequest } from "@/lib/schemas";
import { requireUser } from "@/lib/server/auth";
import { decrypt } from "@/lib/server/secret";

/** Models available to the given key (or the saved key when apiKey is omitted). */
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const body = await readBody(req, aiSettingsRequest);
  if (!body.ok) return body.response;
  const { provider, model, apiKey, baseUrl } = body.data;
  const info = PROVIDERS[provider];
  const saved = auth.user.ai?.provider === provider && auth.user.ai.keyEnc ? decrypt(auth.user.ai.keyEnc) : null;
  const key = apiKey ?? saved ?? "";
  if (!key && !info.keyOptional) return NextResponse.json({ ok: false, message: "Avval API kalitini kiriting." });
  const ai: AiConfig = { provider, model, apiKey: key, baseUrl: provider === "custom" ? (baseUrl ?? "") : info.baseUrl, source: "user" };
  try {
    return NextResponse.json({ ok: true, models: await listModels(ai) });
  } catch (err) {
    console.error("[ai-models]", err);
    return NextResponse.json({ ok: false, message: describeAiError(err) });
  }
}
