import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { decrypt } from "../server/secret";
import type { UserRecord } from "../server/db";
import { PROVIDERS, type ProviderId } from "./providers";

/** A fully resolved AI connection for one request. */
export interface AiConfig {
  provider: ProviderId;
  model: string;
  apiKey: string;
  baseUrl: string;
  source: "user" | "env";
}

export class RefusalError extends Error {}
export class AiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

/** The user's own provider if set, else the server's Claude key, else null (offline engine). */
export function resolveAi(user: UserRecord | null): AiConfig | null {
  const s = user?.ai;
  if (s) {
    const info = PROVIDERS[s.provider];
    const apiKey = s.keyEnc ? decrypt(s.keyEnc) : "";
    if (info && (apiKey || info.keyOptional)) {
      return { provider: s.provider, model: s.model || info.defaultModel, apiKey: apiKey ?? "", baseUrl: s.baseUrl || info.baseUrl, source: "user" };
    }
  }
  const envKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN;
  if (envKey) {
    return { provider: "anthropic", model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5", apiKey: envKey, baseUrl: "", source: "env" };
  }
  return null;
}

/* ---------------- Anthropic ---------------- */

const clients = new Map<string, Anthropic>();
function anthropic(key: string): Anthropic {
  let c = clients.get(key);
  if (!c) {
    c = new Anthropic({ apiKey: key });
    clients.set(key, c);
  }
  return c;
}

function wrapAnthropicError(err: unknown): never {
  if (err instanceof Anthropic.APIError) throw new AiError(err.message, err.status);
  throw err;
}

/* ---------------- OpenAI-compatible ---------------- */

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type Effort = "low" | "medium" | "high";

async function openaiChat(ai: AiConfig, messages: ChatMessage[], opts: { json?: boolean; maxTokens?: number; timeoutMs?: number; effort?: Effort }): Promise<string> {
  const url = `${ai.baseUrl.replace(/\/+$/, "")}/chat/completions`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ai.apiKey) headers.Authorization = `Bearer ${ai.apiKey}`;
  if (ai.provider === "openrouter") {
    headers["HTTP-Referer"] = "https://suhbatdosh.local";
    headers["X-Title"] = "Suhbatdosh";
  }
  const send = async (json: boolean, model: string) => {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.6,
        max_tokens: opts.maxTokens ?? 8000,
        // Gemini models think by default and the thinking counts against max_tokens; cap it to the task.
        ...(ai.provider === "gemini" ? { reasoning_effort: opts.effort ?? "low" } : {}),
        ...(json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 120_000),
    });
    const text = await res.text();
    if (!res.ok) {
      let msg = text.slice(0, 400);
      try {
        // Google wraps the error object in an array.
        const raw = JSON.parse(text) as unknown;
        const j = (Array.isArray(raw) ? raw[0] : raw) as { error?: { message?: string } | string; message?: string };
        msg = (typeof j.error === "string" ? j.error : j.error?.message) ?? j.message ?? msg;
      } catch {
        /* not JSON */
      }
      throw new AiError(msg || `HTTP ${res.status}`, res.status);
    }
    const data = JSON.parse(text) as { choices?: { message?: { content?: string | null } }[] };
    const choice = data.choices?.[0] as { message?: { content?: string | null }; finish_reason?: string } | undefined;
    const content = choice?.message?.content;
    if (!content) {
      throw new AiError(
        choice?.finish_reason === "length" ? "Model javobi token limitiga sig‘madi. Boshqa (tezroq) model tanlang." : "Model bo‘sh javob qaytardi.",
      );
    }
    return content;
  };
  // Busy / rate-limited providers: retry with backoff, then (Gemini) a lighter sibling model.
  const transient = (err: unknown) => err instanceof AiError && [429, 500, 502, 503, 504].includes(err.status ?? 0);
  const fallback = PROVIDERS[ai.provider].fallbackModel;
  const models = fallback && fallback !== ai.model ? [ai.model, fallback] : [ai.model];
  let json = Boolean(opts.json);
  let lastErr: unknown;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await send(json, model);
      } catch (err) {
        lastErr = err;
        // Some models / providers don't support JSON mode: retry without it.
        if (json && err instanceof AiError && err.status === 400) {
          json = false;
          attempt--;
          continue;
        }
        if (!transient(err)) throw err;
        if (attempt < 1) await new Promise((r) => setTimeout(r, 1000));
      }
    }
    if (models.length > 1) console.warn(`[ai:${ai.provider}] ${model} is busy, trying ${models[models.indexOf(model) + 1] ?? "nothing"}`);
  }
  throw lastErr;
}

/** Pulls the first JSON object out of a model reply (handles ```json fences and chatter). */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object in reply");
  return JSON.parse(body.slice(start, end + 1));
}

/* ---------------- public API ---------------- */

/**
 * One structured call. Claude uses native structured outputs; every other
 * provider gets the JSON Schema in the prompt plus JSON mode, and the reply is
 * validated against `schema` (with one repair attempt).
 */
export async function generateStructured<S extends z.ZodType>(
  ai: AiConfig,
  opts: { schema: S; system: string; prompt: string; effort: "low" | "medium" | "high"; maxTokens?: number },
): Promise<z.infer<S>> {
  if (ai.provider === "anthropic") {
    const useEffort = !/haiku/i.test(ai.model);
    const response = await anthropic(ai.apiKey)
      .beta.messages.parse({
        model: ai.model,
        max_tokens: opts.maxTokens ?? 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: opts.system,
        messages: [{ role: "user", content: opts.prompt }],
        output_config: { ...(useEffort ? { effort: opts.effort } : {}), format: betaZodOutputFormat(opts.schema) },
      })
      .catch(wrapAnthropicError);
    if (response.stop_reason === "refusal") throw new RefusalError(response.stop_details?.explanation ?? "The model declined this request.");
    if (!response.parsed_output) throw new Error(`Model returned no parseable output (stop_reason: ${response.stop_reason}).`);
    return response.parsed_output as z.infer<S>;
  }

  const schemaJson = JSON.stringify(z.toJSONSchema(opts.schema));
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `${opts.system}\n\nRespond with ONE valid JSON object only — no markdown, no commentary. It must match this JSON Schema exactly (all required fields present):\n${schemaJson}`,
    },
    { role: "user", content: opts.prompt },
  ];
  let reply = await openaiChat(ai, messages, { json: true, maxTokens: opts.maxTokens, effort: opts.effort });
  for (let attempt = 0; ; attempt++) {
    try {
      const parsed = opts.schema.safeParse(extractJson(reply));
      if (parsed.success) return parsed.data;
      throw new Error(parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
    } catch (err) {
      if (attempt >= 1) throw new AiError(`Model noto‘g‘ri formatda javob berdi: ${(err as Error).message}`);
      reply = await openaiChat(
        ai,
        [...messages, { role: "assistant", content: reply }, { role: "user", content: `That was not valid. Problem: ${(err as Error).message}. Reply again with only the corrected JSON object.` }],
        { json: true, maxTokens: opts.maxTokens, effort: "low" },
      );
    }
  }
}

/** Free-form chat (the AI coach). */
export async function chat(ai: AiConfig, system: string, messages: { role: "user" | "assistant"; content: string }[], maxTokens = 2500): Promise<string> {
  if (ai.provider === "anthropic") {
    const res = await anthropic(ai.apiKey)
      .messages.create({ model: ai.model, max_tokens: maxTokens, system, messages })
      .catch(wrapAnthropicError);
    if (res.stop_reason === "refusal") throw new RefusalError("The model declined this request.");
    return res.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("")
      .trim();
  }
  return (await openaiChat(ai, [{ role: "system", content: system }, ...messages], { maxTokens, timeoutMs: 90_000, effort: "low" })).trim();
}

/** Model ids the key can use (OpenAI-compatible GET /models), chat-capable ones first. */
export async function listModels(ai: AiConfig): Promise<string[]> {
  if (ai.provider === "anthropic") {
    const page = await anthropic(ai.apiKey).models.list({ limit: 100 }).catch(wrapAnthropicError);
    return page.data.map((m) => m.id);
  }
  const headers: Record<string, string> = {};
  if (ai.apiKey) headers.Authorization = `Bearer ${ai.apiKey}`;
  const res = await fetch(`${ai.baseUrl.replace(/\/+$/, "")}/models`, { headers, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new AiError((await res.text()).slice(0, 300) || `HTTP ${res.status}`, res.status);
  const data = (await res.json()) as { data?: { id: string }[] };
  const skip = /(tts|image|embed|whisper|transcri|lyria|robotics|computer-use|veo|imagen|moderation|guard|dall-e|audio|realtime|search|deep-research|antigravity|nano-banana|omni)/i;
  return [...new Set((data.data ?? []).map((m) => m.id.replace(/^models\//, "")).filter((id) => !skip.test(id)))].sort();
}

/** Small round-trip used by the "Test" button in Settings. */
export async function testConnection(ai: AiConfig): Promise<string> {
  return chat(ai, "You are a connection test. Reply with a single short sentence in Uzbek.", [{ role: "user", content: "Salom! Ulanish ishlayaptimi?" }], 400);
}

/** Human-readable reason for a failed call, in Uzbek. */
export function describeAiError(err: unknown): string {
  const status = err instanceof AiError ? err.status : undefined;
  const msg = err instanceof Error ? err.message : String(err);
  if (status === 401 || status === 403) return "Kalit noto‘g‘ri yoki ruxsat yo‘q (401/403). Tokenni tekshiring.";
  if (status === 404) return `Model yoki manzil topilmadi (404). “Modellarni yuklash” tugmasi bilan mavjud modelni tanlang.${msg && !/^HTTP/.test(msg) ? ` Provayder: ${msg.slice(0, 220)}` : ""}`;
  if (status === 429) return "Limitdan oshdingiz (429). Birozdan so‘ng urinib ko‘ring yoki boshqa model tanlang.";
  if (status && status >= 500) return `Provayder serverida xato (${status}). Keyinroq urinib ko‘ring.`;
  if (/timeout|aborted/i.test(msg)) return "Javob kutish vaqti tugadi. Tezroq model tanlang yoki keyinroq urinib ko‘ring.";
  if (/fetch failed|ECONNREFUSED|ENOTFOUND/i.test(msg)) return "Provayder manziliga ulanib bo‘lmadi. Manzil (base URL) va internetni tekshiring.";
  return msg.slice(0, 300);
}
