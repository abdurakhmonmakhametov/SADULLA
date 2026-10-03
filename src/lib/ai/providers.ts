/**
 * AI providers the user can plug in from Settings. Everything except Claude
 * speaks the OpenAI chat-completions protocol, so one adapter covers them.
 * Shared by client (settings UI) and server — no secrets here.
 */

export type ProviderId = "anthropic" | "openai" | "gemini" | "groq" | "openrouter" | "deepseek" | "mistral" | "custom";

export interface ProviderInfo {
  label: string;
  /** Has a usable free tier. */
  free: boolean;
  /** OpenAI-compatible base URL (unused for anthropic; user-supplied for custom). */
  baseUrl: string;
  defaultModel: string;
  models: string[];
  keyUrl?: string;
  keyPlaceholder: string;
  note: string;
  /** Key may be empty (local servers such as Ollama). */
  keyOptional?: boolean;
  /** Used automatically when the chosen model is overloaded (503/429). */
  fallbackModel?: string;
}

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  anthropic: {
    label: "Anthropic Claude",
    free: false,
    baseUrl: "",
    defaultModel: "claude-sonnet-5-5",
    models: ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-4-5-20251001", "claude-fable-5-1"],
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyPlaceholder: "sk-ant-…",
    note: "Eng sifatli baholash va o‘zbek tili. Pullik.",
  },
  openai: {
    label: "OpenAI (ChatGPT)",
    free: false,
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
    keyUrl: "https://platform.openai.com/api-keys",
    keyPlaceholder: "sk-…",
    note: "Pullik. gpt-4o-mini arzon va tez.",
  },
  gemini: {
    label: "Google Gemini",
    free: true,
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    // "-latest" aliases follow Google's current model, so they don't break when old versions retire.
    defaultModel: "gemini-flash-latest",
    fallbackModel: "gemini-flash-lite-latest",
    models: ["gemini-flash-latest", "gemini-3.8-flash", "gemini-3.5-flash", "gemini-flash-lite-latest", "gemini-pro-latest"],
    keyUrl: "https://aistudio.google.com/apikey",
    keyPlaceholder: "AIza… yoki AQ.…",
    note: "Bepul tarif bor. O‘zbek tilini yaxshi tushunadi — bepul variantlar ichida eng yaxshisi.",
  },
  groq: {
    label: "Groq",
    free: true,
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "openai/gpt-oss-120b", "qwen/qwen3-32b"],
    keyUrl: "https://console.groq.com/keys",
    keyPlaceholder: "gsk_…",
    note: "Bepul va juda tez. Ingliz tilida kuchliroq.",
  },
  openrouter: {
    label: "OpenRouter",
    free: true,
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    models: ["meta-llama/llama-3.3-70b-instruct:free", "deepseek/deepseek-chat-v3-0324:free", "google/gemini-2.0-flash-exp:free", "openai/gpt-4o-mini"],
    keyUrl: "https://openrouter.ai/keys",
    keyPlaceholder: "sk-or-…",
    note: "Yuzlab modellar bitta kalit bilan. “:free” bilan tugaganlari bepul.",
  },
  deepseek: {
    label: "DeepSeek",
    free: false,
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
    keyUrl: "https://platform.deepseek.com/api_keys",
    keyPlaceholder: "sk-…",
    note: "Juda arzon pullik variant.",
  },
  mistral: {
    label: "Mistral AI",
    free: true,
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-small-latest",
    models: ["mistral-small-latest", "mistral-medium-latest", "mistral-large-latest"],
    keyUrl: "https://console.mistral.ai/api-keys",
    keyPlaceholder: "…",
    note: "Bepul “Experiment” tarifi mavjud.",
  },
  custom: {
    label: "Boshqa (OpenAI-mos)",
    free: true,
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.1",
    models: [],
    keyPlaceholder: "Kerak bo‘lmasa bo‘sh qoldiring",
    note: "Ollama, LM Studio, Together, Azure OpenAI va boshqa OpenAI-mos serverlar.",
    keyOptional: true,
  },
};

export const PROVIDER_ORDER: ProviderId[] = ["gemini", "groq", "openrouter", "mistral", "anthropic", "openai", "deepseek", "custom"];

/** What the settings page shows about the active configuration (never the key itself). */
export interface AiSettingsView {
  /** user = the user's own key; env = server default; none = offline engine. */
  source: "user" | "env" | "none";
  provider: ProviderId | null;
  model: string | null;
  baseUrl: string | null;
  keyLast4: string | null;
}
