import { NextResponse } from "next/server";
import { readBody } from "@/lib/api";
import { resolveAi } from "@/lib/ai/client";
import { PROVIDERS, type AiSettingsView } from "@/lib/ai/providers";
import { aiSettingsRequest } from "@/lib/schemas";
import { requireUser } from "@/lib/server/auth";
import { mutate, type UserRecord } from "@/lib/server/db";
import { encrypt } from "@/lib/server/secret";

export const dynamic = "force-dynamic";

function view(user: UserRecord): AiSettingsView {
  const ai = resolveAi(user);
  if (!ai) return { source: "none", provider: user.ai?.provider ?? null, model: user.ai?.model ?? null, baseUrl: user.ai?.baseUrl ?? null, keyLast4: null };
  return {
    source: ai.source,
    provider: ai.provider,
    model: ai.model,
    baseUrl: ai.source === "user" ? (user.ai?.baseUrl ?? null) : null,
    keyLast4: ai.source === "user" ? (user.ai?.keyLast4 ?? null) : null,
  };
}

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  return NextResponse.json(view(auth.user));
}

/** Save the user's provider. Omit apiKey to keep the stored one. */
export async function PUT(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const body = await readBody(req, aiSettingsRequest);
  if (!body.ok) return body.response;
  const { provider, model, apiKey, baseUrl } = body.data;
  const info = PROVIDERS[provider];
  if (provider === "custom" && !baseUrl) return NextResponse.json({ error: "Server manzilini (base URL) kiriting.", field: "baseUrl" }, { status: 400 });

  const updated = await mutate((d) => {
    const u = d.users.find((x) => x.id === auth.user.id);
    if (!u) return null;
    const sameProvider = u.ai?.provider === provider;
    let keyEnc = sameProvider ? u.ai?.keyEnc : undefined;
    let keyLast4 = sameProvider ? u.ai?.keyLast4 : undefined;
    if (apiKey !== undefined) {
      keyEnc = apiKey ? encrypt(apiKey) : undefined;
      keyLast4 = apiKey ? apiKey.slice(-4) : undefined;
    }
    if (!keyEnc && !info.keyOptional) return "nokey" as const;
    u.ai = { provider, model, baseUrl: provider === "custom" ? baseUrl : undefined, keyEnc, keyLast4, updatedAt: Date.now() };
    return u;
  });
  if (updated === "nokey") return NextResponse.json({ error: "API kalitini (token) kiriting.", field: "apiKey" }, { status: 400 });
  if (!updated) return NextResponse.json({ error: "Foydalanuvchi topilmadi." }, { status: 404 });
  return NextResponse.json(view(updated));
}

/** Forget the user's provider (back to the server default / offline). */
export async function DELETE() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const updated = await mutate((d) => {
    const u = d.users.find((x) => x.id === auth.user.id);
    if (u) delete u.ai;
    return u;
  });
  return NextResponse.json(updated ? view(updated) : { source: "none" });
}
