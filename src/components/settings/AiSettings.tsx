"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Eye, EyeOff, KeyRound, ListRestart, PlugZap, Save, Trash2, XCircle } from "lucide-react";
import { Button } from "../ui/Button";
import { Field, inputClass } from "../ui/Field";
import { Spinner } from "../ui/Spinner";
import { cn } from "@/lib/cn";
import { PROVIDERS, PROVIDER_ORDER, type AiSettingsView, type ProviderId } from "@/lib/ai/providers";
import { refreshStatus } from "@/hooks/useVoice";

type TestState = { ok: boolean; message: string; latencyMs?: number } | null;

export function AiSettings() {
  const [view, setView] = useState<AiSettingsView | null>(null);
  const [provider, setProvider] = useState<ProviderId>("gemini");
  const [model, setModel] = useState(PROVIDERS.gemini.defaultModel);
  const [baseUrl, setBaseUrl] = useState(PROVIDERS.custom.baseUrl);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState<"save" | "test" | "delete" | "models" | null>(null);
  const [loaded, setLoaded] = useState<{ provider: ProviderId; models: string[] } | null>(null);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [test, setTest] = useState<TestState>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function load(v: AiSettingsView) {
    setView(v);
    if (v.source === "user" && v.provider) {
      setProvider(v.provider);
      setModel(v.model ?? PROVIDERS[v.provider].defaultModel);
      if (v.baseUrl) setBaseUrl(v.baseUrl);
    }
  }

  useEffect(() => {
    let alive = true;
    void fetch("/api/ai-settings")
      .then((r) => r.json() as Promise<AiSettingsView>)
      .then((v) => alive && load(v))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const info = PROVIDERS[provider];
  const hasSavedKey = view?.source === "user" && view.provider === provider && !!view.keyLast4;

  function pickProvider(p: ProviderId) {
    setProvider(p);
    setModel(view?.source === "user" && view.provider === p && view.model ? view.model : PROVIDERS[p].defaultModel);
    setApiKey("");
    setTest(null);
    setError(null);
    setModelsError(null);
  }

  async function loadModels() {
    setBusy("models");
    setModelsError(null);
    try {
      const res = await fetch("/api/ai-settings/models", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) });
      const data = (await res.json()) as { ok?: boolean; models?: string[]; message?: string; error?: string };
      if (data.ok && data.models?.length) setLoaded({ provider, models: data.models });
      else setModelsError(data.message ?? data.error ?? "Model ro‘yxati bo‘sh.");
    } catch {
      setModelsError("Serverga ulanib bo‘lmadi.");
    } finally {
      setBusy(null);
    }
  }

  function payload() {
    return {
      provider,
      model: model.trim() || PROVIDERS[provider].defaultModel,
      ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      ...(provider === "custom" ? { baseUrl: baseUrl.trim() } : {}),
    };
  }

  async function runTest() {
    setBusy("test");
    setTest(null);
    setError(null);
    try {
      const res = await fetch("/api/ai-settings/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) });
      const data = (await res.json()) as { ok?: boolean; message?: string; latencyMs?: number; error?: string };
      setTest(res.ok ? { ok: !!data.ok, message: data.message ?? "", latencyMs: data.latencyMs } : { ok: false, message: data.error ?? "Xato" });
    } catch {
      setTest({ ok: false, message: "Serverga ulanib bo‘lmadi." });
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy("save");
    setError(null);
    try {
      const res = await fetch("/api/ai-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) });
      const data = (await res.json()) as AiSettingsView & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Saqlab bo‘lmadi.");
        return;
      }
      load(data);
      setApiKey("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      refreshStatus();
    } catch {
      setError("Serverga ulanib bo‘lmadi.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    try {
      const res = await fetch("/api/ai-settings", { method: "DELETE" });
      load((await res.json()) as AiSettingsView);
      setApiKey("");
      setTest(null);
      refreshStatus();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Current status */}
      <div
        className={cn(
          "flex items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-sm",
          view?.source === "none" ? "border-warn/30 bg-warn-soft" : "border-lime bg-lime-soft",
        )}
      >
        <PlugZap className={cn("mt-0.5 size-4 shrink-0", view?.source === "none" ? "text-warn" : "text-lime-ink")} />
        <div className="min-w-0">
          {!view ? (
            <p className="text-muted">Yuklanmoqda…</p>
          ) : view.source === "user" && view.provider ? (
            <p>
              <b>Faol:</b> {PROVIDERS[view.provider].label} · <span className="font-mono text-[13px]">{view.model}</span>
              {view.keyLast4 && <span className="text-muted"> · kalit ••••{view.keyLast4}</span>}
            </p>
          ) : view.source === "env" && view.provider ? (
            <p>
              <b>Server standarti:</b> {PROVIDERS[view.provider].label} · <span className="font-mono text-[13px]">{view.model}</span>. O‘z kalitingizni ulasangiz, u ishlatiladi.
            </p>
          ) : (
            <p>
              <b>AI ulanmagan</b> — ichki oflayn tizim ishlayapti. Bepul kalit (Gemini, Groq, OpenRouter) bilan savollar va baholash ancha aqlli bo‘ladi.
            </p>
          )}
        </div>
      </div>

      {/* Provider picker */}
      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink">Provayder</p>
        <div role="radiogroup" aria-label="AI provayder" className="grid gap-2 sm:grid-cols-2">
          {PROVIDER_ORDER.map((p) => {
            const it = PROVIDERS[p];
            const active = provider === p;
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => pickProvider(p)}
                className={cn(
                  "flex items-start gap-3 rounded-[var(--radius-md)] border p-3 text-left transition-colors",
                  active ? "border-ink bg-lime-soft shadow-[0_0_0_2px_var(--color-lime)]" : "border-line hover:border-line-strong hover:bg-canvas",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-bold">{it.label}</span>
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", it.free ? "bg-lime text-ink" : "bg-sunken text-muted")}>
                      {it.free ? "Bepul" : "Pullik"}
                    </span>
                    {view?.source === "user" && view.provider === p && <span className="size-1.5 rounded-full bg-good" title="Hozir faol" />}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted">{it.note}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Model"
          htmlFor="ai-model"
          aside={
            <button
              type="button"
              onClick={() => void loadModels()}
              disabled={!!busy}
              className="inline-flex items-center gap-1 text-xs font-semibold text-lime-ink hover:underline disabled:opacity-50"
            >
              {busy === "models" ? <Spinner className="size-3" /> : <ListRestart className="size-3" />} Modellarni yuklash
            </button>
          }
          hint={
            modelsError ? (
              <span className="text-bad">{modelsError}</span>
            ) : loaded?.provider === provider ? (
              `Kalitingiz uchun ${loaded.models.length} ta model topildi.`
            ) : (
              "Ro‘yxatdan tanlang yoki “Modellarni yuklash” bilan kalitingizga mavjud modellarni oling."
            )
          }
        >
          <input id="ai-model" list="ai-models" value={model} onChange={(e) => setModel(e.target.value)} className={cn(inputClass, "h-10 font-mono text-sm")} autoComplete="off" spellCheck={false} />
          <datalist id="ai-models">
            {(loaded?.provider === provider ? loaded.models : info.models).map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          {(loaded?.provider === provider ? loaded.models : info.models).length > 0 && (
            <div className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
              {(loaded?.provider === provider ? loaded.models : info.models).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModel(m)}
                  className={cn(
                    "rounded-md border px-2 py-0.5 font-mono text-[11px] transition-colors",
                    model === m ? "border-ink bg-lime text-ink" : "border-line text-muted hover:border-line-strong hover:text-ink",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </Field>
        <Field
          label="API kalit (token)"
          htmlFor="ai-key"
          optional={info.keyOptional}
          aside={
            info.keyUrl && (
              <a href={info.keyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-lime-ink hover:underline">
                Kalit olish <ExternalLink className="size-3" />
              </a>
            )
          }
          hint={hasSavedKey ? `Saqlangan kalit: ••••${view?.keyLast4}. Almashtirish uchun yangisini kiriting.` : "Kalit shifrlangan holda serverda saqlanadi."}
        >
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              id="ai-key"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasSavedKey ? `••••••••${view?.keyLast4}` : info.keyPlaceholder}
              className={cn(inputClass, "h-10 pl-9 pr-10 font-mono text-sm")}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              aria-label={showKey ? "Kalitni yashirish" : "Kalitni ko‘rsatish"}
              className="absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-sunken hover:text-ink"
            >
              {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
      </div>

      {provider === "custom" && (
        <Field label="Server manzili (base URL)" htmlFor="ai-base" hint="Masalan: Ollama — http://localhost:11434/v1, LM Studio — http://localhost:1234/v1">
          <input id="ai-base" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className={cn(inputClass, "h-10 font-mono text-sm")} autoComplete="off" spellCheck={false} />
        </Field>
      )}

      {test && (
        <p
          role="status"
          className={cn(
            "flex items-start gap-2 rounded-[var(--radius-md)] px-3.5 py-2.5 text-[13px]",
            test.ok ? "bg-good-soft text-good" : "bg-bad-soft text-bad",
          )}
        >
          {test.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <XCircle className="mt-0.5 size-4 shrink-0" />}
          <span>
            {test.ok ? <b>Ulanish ishlayapti{test.latencyMs ? ` (${(test.latencyMs / 1000).toFixed(1)} s)` : ""}. </b> : <b>Ulanib bo‘lmadi. </b>}
            {test.message && <span className="text-ink-2">{test.ok ? `Model javobi: “${test.message}”` : test.message}</span>}
          </span>
        </p>
      )}
      {error && <p className="rounded-[var(--radius-md)] bg-bad-soft px-3.5 py-2.5 text-[13px] font-medium text-bad">{error}</p>}

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <Button variant="secondary" onClick={() => void runTest()} disabled={!!busy || !model.trim()} icon={busy === "test" ? <Spinner /> : <PlugZap className="size-4" />}>
          Ulanishni tekshirish
        </Button>
        <Button variant="accent" onClick={() => void save()} disabled={!!busy || !model.trim()} icon={busy === "save" ? <Spinner /> : <Save className="size-4" />}>
          {saved ? "Saqlandi" : "Saqlash"}
        </Button>
        {view?.source === "user" && (
          <button
            type="button"
            onClick={() => void remove()}
            disabled={!!busy}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] px-3 text-sm font-semibold text-bad transition-colors hover:bg-bad-soft disabled:opacity-45"
          >
            {busy === "delete" ? <Spinner /> : <Trash2 className="size-4" />} Kalitni o‘chirish
          </button>
        )}
      </div>
    </div>
  );
}
