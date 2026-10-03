import "server-only";
import { createHash } from "node:crypto";

/**
 * Server speech services.
 * - Uzbek: UzbekVoice.ai (TTS voices lola / jasur, STT model enhanced-stt). Set UZBEKVOICE_API_KEY.
 * - Any language: Azure AI Speech neural voices. Set AZURE_SPEECH_KEY + AZURE_SPEECH_REGION.
 */

export type VoiceGender = "female" | "male";
export type SpeechLang = "uz" | "en";

/** Either a ready URL the browser can play directly, or raw audio bytes. */
export type TtsResult = { url: string } | { audio: Buffer };

const UZBEKVOICE = "https://uzbekvoice.ai/api/v1";
const UV_VOICES: Record<VoiceGender, string> = { female: "lola", male: "jasur" };

const AZURE_VOICES: Record<SpeechLang, Record<VoiceGender, { name: string; lang: string }>> = {
  uz: { female: { name: "uz-UZ-MadinaNeural", lang: "uz-UZ" }, male: { name: "uz-UZ-SardorNeural", lang: "uz-UZ" } },
  en: { female: { name: "en-US-AvaMultilingualNeural", lang: "en-US" }, male: { name: "en-US-AndrewMultilingualNeural", lang: "en-US" } },
};

const uzbekVoiceKey = () => process.env.UZBEKVOICE_API_KEY;
const azureEnabled = () => Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION);

/** Languages the server can voice / transcribe. */
export function speechStatus(): { tts: SpeechLang[]; stt: SpeechLang[] } {
  const tts: SpeechLang[] = [];
  if (uzbekVoiceKey() || azureEnabled()) tts.push("uz");
  if (azureEnabled()) tts.push("en");
  return { tts, stt: uzbekVoiceKey() ? ["uz"] : [] };
}

/* ---- TTS ---- */

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);

type Cached = { result: Promise<TtsResult>; expires: number };
// Kept on globalThis: route bundles otherwise each get their own copy.
const g = globalThis as typeof globalThis & { __ttsCache?: Map<string, Cached> };
const cache = (g.__ttsCache ??= new Map());
const MAX_CACHE = 400;
const URL_TTL = 3 * 24 * 3600 * 1000; // UzbekVoice links are signed for 4 days.

async function uzbekVoiceTts(text: string, gender: VoiceGender): Promise<TtsResult> {
  const res = await fetch(`${UZBEKVOICE}/tts`, {
    method: "POST",
    headers: { Authorization: uzbekVoiceKey()!, "Content-Type": "application/json" },
    body: JSON.stringify({ text, model: UV_VOICES[gender], blocking: "true" }),
    signal: AbortSignal.timeout(30_000),
  });
  const data = (await res.json().catch(() => null)) as { status?: string; result?: { url?: string } } | null;
  if (!res.ok || data?.status !== "SUCCESS" || !data.result?.url) throw new Error(`UzbekVoice TTS failed: ${res.status} ${JSON.stringify(data)}`);
  return { url: data.result.url };
}

async function azureTts(text: string, lang: SpeechLang, gender: VoiceGender): Promise<TtsResult> {
  const voice = AZURE_VOICES[lang][gender];
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${voice.lang}"><voice name="${voice.name}"><prosody rate="-4%">${escapeXml(text)}</prosody></voice></speak>`;
  const res = await fetch(`https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY!,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "suhbatdosh",
    },
    body: ssml,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Azure TTS failed: ${res.status} ${await res.text().catch(() => "")}`);
  return { audio: Buffer.from(await res.arrayBuffer()) };
}

/** Synthesises speech, de-duplicating concurrent and repeated requests. */
export function synthesize(text: string, lang: SpeechLang, gender: VoiceGender): Promise<TtsResult> {
  const useUv = lang === "uz" && Boolean(uzbekVoiceKey());
  if (!useUv && !azureEnabled()) return Promise.reject(new Error("No TTS provider for " + lang));

  const key = createHash("sha1").update(`${useUv ? "uv" : "az"}|${lang}|${gender}|${text}`).digest("hex");
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.result;

  const result = useUv ? uzbekVoiceTts(text, gender) : azureTts(text, lang, gender);
  cache.set(key, { result, expires: Date.now() + URL_TTL });
  result.catch(() => cache.delete(key));
  if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value!);
  return result;
}

/* ---- STT ---- */

/** Transcribes a short (< 1 min) Uzbek clip. Tries the Uzbek-tuned model first. */
export async function transcribe(audio: Blob): Promise<string> {
  let lastError: unknown;
  for (const model of ["enhanced-stt", "general"]) {
    try {
      const form = new FormData();
      form.append("file", audio, "answer.wav");
      form.append("return_offsets", "false");
      form.append("run_diarization", "false");
      form.append("language", "uz");
      form.append("model", model);
      form.append("blocking", "true");
      const res = await fetch(`${UZBEKVOICE}/stt`, {
        method: "POST",
        headers: { Authorization: uzbekVoiceKey()! },
        body: form,
        signal: AbortSignal.timeout(45_000),
      });
      const data = (await res.json().catch(() => null)) as { status?: string; result?: { text?: string } } | null;
      if (res.ok && data?.status === "SUCCESS") return (data.result?.text ?? "").trim();
      lastError = new Error(`UzbekVoice STT ${model} failed: ${res.status} ${JSON.stringify(data)}`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}
