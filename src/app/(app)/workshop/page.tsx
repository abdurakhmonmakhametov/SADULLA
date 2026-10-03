"use client";

import { Suspense, useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, ClipboardList, Copy, History, Library, ListChecks, Mic, PenLine, Sparkles, Square, ThumbsUp, Volume2, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/shell/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/ui/Field";
import { ScoreDial } from "@/components/ui/Score";
import { Segmented } from "@/components/ui/Segmented";
import { Spinner } from "@/components/ui/Spinner";
import { appendPhrase, useDictation } from "@/hooks/useDictation";
import { useMicStream } from "@/hooks/useMicStream";
import { useStatus, useVoice } from "@/hooks/useVoice";
import { LANGUAGES } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { formatDate, wordCount } from "@/lib/format";
import type { WorkshopResult } from "@/lib/schemas";
import { speechStats } from "@/lib/speech";
import type { InterviewLanguage } from "@/lib/types";

type Attempt = { at: number; question: string; answer: string; language: InterviewLanguage; role: string; result: WorkshopResult; ai: boolean };
const HISTORY_KEY = "suhbatdosh.workshop";

function readHistory(): Attempt[] {
  try {
    const v = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as Attempt[];
    return Array.isArray(v) ? v.slice(0, 12) : [];
  } catch {
    return [];
  }
}

function Workshop() {
  const params = useSearchParams();
  const status = useStatus();
  const [question, setQuestion] = useState(params.get("q") ?? "");
  const [answer, setAnswer] = useState(params.get("a") ?? "");
  const [role, setRole] = useState(params.get("role") ?? "");
  const [language, setLanguage] = useState<InterviewLanguage>(params.get("lang") === "en" ? "en" : "uz");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<{ data: WorkshopResult; ai: boolean } | null>(null);
  const [history, setHistory] = useState<Attempt[]>([]);
  const [copied, setCopied] = useState(false);
  const [wantMic, setWantMic] = useState(false);

  const mic = useMicStream();
  const voice = useVoice(language);
  const dictation = useDictation(
    language,
    mic.stream,
    useCallback((text: string) => setAnswer((prev) => appendPhrase(prev, text, language)), [language]),
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(readHistory());
  }, []);

  // Start dictation once the mic stream is ready.
  useEffect(() => {
    if (wantMic && (mic.stream || dictation.mode === "browser")) {
      dictation.start("workshop");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWantMic(false);
    }
  }, [wantMic, mic.stream, dictation]);

  async function toggleMic() {
    if (dictation.listening) {
      dictation.stop();
      return;
    }
    voice.cancel();
    if (dictation.mode === "server") await mic.request();
    setWantMic(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    await dictation.flush();
    try {
      const res = await fetch("/api/workshop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer, language, role: role || undefined }),
      });
      const data = (await res.json()) as { result?: WorkshopResult; source?: string; notice?: string; error?: string };
      if (!res.ok || !data.result) {
        setError(data.error ?? "Tahlil qilib bo‘lmadi.");
        return;
      }
      const ai = data.source === "ai";
      setResult({ data: data.result, ai });
      if (data.notice) setNotice(data.notice);
      const attempt: Attempt = { at: Date.now(), question, answer, language, role, result: data.result, ai };
      const next = [attempt, ...history].slice(0, 12);
      setHistory(next);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      setTimeout(() => document.getElementById("result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch {
      setError("Serverga ulanib bo‘lmadi.");
    } finally {
      setBusy(false);
    }
  }

  const stats = speechStats(answer, 0);
  const r = result?.data;

  return (
    <>
      <PageHeader
        title="Javob ustaxonasi"
        description="Bitta savolga javob bering — ball, aniq tavsiyalar va yaxshilangan variantni oling."
        actions={
          <Link href="/questions" className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] border border-line-strong bg-paper px-4 text-sm font-semibold shadow-[var(--shadow-pop)] hover:bg-sunken">
            <Library className="size-4" /> Savollar bankidan tanlash
          </Link>
        }
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <form onSubmit={submit} className="pop-card space-y-5 rounded-[var(--radius-lg)] bg-paper p-5 sm:p-6">
            <Field label="Savol" htmlFor="ws-q">
              <textarea
                id="ws-q"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="Masalan: Jamoadoshingiz bilan kelishmovchilik bo‘lgan vaziyatni aytib bering."
                className={cn(inputClass, "resize-y py-2.5 leading-relaxed")}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Lavozim" htmlFor="ws-role" optional>
                <input id="ws-role" value={role} onChange={(e) => setRole(e.target.value)} maxLength={120} placeholder="Masalan: Frontend dasturchi" className={cn(inputClass, "h-10 text-sm")} />
              </Field>
              <Field label="Javob tili">
                <Segmented
                  label="Javob tili"
                  value={language}
                  onChange={setLanguage}
                  options={(Object.keys(LANGUAGES) as InterviewLanguage[]).map((l) => ({ value: l, label: LANGUAGES[l].label }))}
                />
              </Field>
            </div>
            <Field
              label="Javobingiz"
              htmlFor="ws-a"
              aside={<span className="text-[11px] font-semibold text-muted tabular">{wordCount(answer)} so‘z</span>}
              hint={dictation.supported ? "Yozing yoki mikrofon tugmasini bosib gapiring." : undefined}
            >
              <div className="relative">
                <textarea
                  id="ws-a"
                  value={answer}
                  onChange={(e) => {
                    if (dictation.listening) dictation.stop();
                    setAnswer(e.target.value);
                  }}
                  rows={7}
                  maxLength={8000}
                  placeholder="Javobingizni xuddi suhbatda aytgandek yozing yoki gapiring…"
                  className={cn(inputClass, "resize-y py-3 pr-14 leading-relaxed")}
                />
                {dictation.supported && (
                  <button
                    type="button"
                    onClick={() => void toggleMic()}
                    aria-label={dictation.listening ? "Yozishni to‘xtatish" : "Ovoz bilan javob berish"}
                    className={cn(
                      "absolute bottom-3 right-3 grid size-10 place-items-center rounded-full transition-colors",
                      dictation.listening ? "bg-bad text-white" : "bg-lime text-ink hover:bg-lime-strong",
                    )}
                  >
                    {dictation.listening && <span className="absolute -inset-1 animate-ping rounded-full border-2 border-bad/40 [animation-duration:1.6s]" />}
                    {dictation.listening ? <Square className="relative size-3.5 fill-current" /> : <Mic className="size-[18px]" />}
                  </button>
                )}
              </div>
            </Field>
            {(dictation.listening || dictation.pending > 0 || dictation.interim) && (
              <p className="-mt-3 text-[13px] text-muted" aria-live="polite">
                {dictation.interim || (dictation.listening ? "Tinglayapman…" : "Matnga aylantirilmoqda…")}
              </p>
            )}
            {(dictation.error || mic.error) && <p className="-mt-3 text-[13px] font-medium text-bad">{dictation.error ?? mic.error}</p>}
            {stats.fillers > 0 && (
              <p className="-mt-3 text-xs font-semibold text-warn">
                To‘ldiruvchi so‘zlar: {stats.fillers} ({stats.topFillers.map(([f]) => f).join(", ")})
              </p>
            )}
            {error && <p className="rounded-[var(--radius-md)] bg-bad-soft px-3.5 py-2.5 text-sm font-medium text-bad">{error}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <span className="text-xs text-muted">{status ? (status.ai ? `Tahlil: ${status.aiProvider}` : "Oflayn tahlil — aniqroq natija uchun AI ulang") : ""}</span>
              <Button type="submit" variant="accent" disabled={busy || question.trim().length < 3 || answer.trim().length < 3} icon={busy ? <Spinner /> : <Wand2 className="size-4" />}>
                {busy ? "Tahlil qilinmoqda…" : "Tahlil qilish"}
              </Button>
            </div>
          </form>

          {r && (
            <div id="result" className="scroll-mt-6 space-y-4">
              {notice && <p className="rounded-[var(--radius-md)] border border-warn/30 bg-warn-soft px-4 py-2.5 text-sm font-medium text-warn">{notice}</p>}
              <Card pop className="grid animate-rise gap-6 p-5 sm:p-6 md:grid-cols-[auto_1fr] md:items-center">
                <div className="flex flex-col items-center gap-2">
                  <ScoreDial score={Math.round(r.score)} size={132} />
                  <Badge tone={result?.ai ? "lime" : "warn"}>{result?.ai ? "AI tahlili" : "Oflayn tahlil"}</Badge>
                </div>
                <div className="space-y-4">
                  <p className="text-[15px] leading-relaxed text-ink">{r.verdict}</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="flex items-center gap-1.5 text-[13px] font-bold text-good">
                        <ThumbsUp className="size-4" /> Yaxshi tomonlar
                      </p>
                      <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
                        {r.strengths.map((s) => (
                          <li key={s} className="flex gap-2">
                            <Check className="mt-0.5 size-3.5 shrink-0 text-good" strokeWidth={3} /> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-[13px] font-bold text-warn">
                        <ListChecks className="size-4" /> Nimani yaxshilash kerak
                      </p>
                      <ul className="mt-2 space-y-1.5 text-sm text-ink-2">
                        {r.improvements.map((s) => (
                          <li key={s} className="flex gap-2">
                            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-warn" /> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </Card>
              <div className="grid animate-rise gap-4 [animation-delay:60ms] md:grid-cols-[1fr_1.4fr]">
                <Card pop className="p-5">
                  <p className="flex items-center gap-2 text-[15px] font-bold">
                    <ClipboardList className="size-4 text-lime-ink" /> Javob tuzilmasi
                  </p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-2">{r.structure}</p>
                </Card>
                <Card pop className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-[15px] font-bold">
                      <Sparkles className="size-4 text-lime-ink" /> Yaxshilangan javob
                    </p>
                    <div className="flex gap-1">
                      {voice.available && (
                        <Button variant="ghost" size="sm" onClick={() => (voice.speaking ? voice.cancel() : voice.speak(r.improvedAnswer))} icon={voice.speaking ? <Square className="size-3 fill-current" /> : <Volume2 className="size-4" />}>
                          {voice.speaking ? "To‘xtatish" : "Tinglash"}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          void navigator.clipboard?.writeText(r.improvedAnswer).then(() => {
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                          })
                        }
                        icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                      >
                        {copied ? "Nusxalandi" : "Nusxalash"}
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 rounded-[var(--radius-md)] border-l-[3px] border-lime bg-canvas p-4 text-[15px] leading-relaxed text-ink">{r.improvedAnswer}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    icon={<PenLine className="size-4" />}
                    onClick={() => {
                      setAnswer("");
                      setResult(null);
                      document.getElementById("ws-a")?.focus();
                    }}
                  >
                    Qayta urinib ko‘rish
                  </Button>
                </Card>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-8">
          <Card pop className="p-5">
            <p className="eyebrow">Yaxshi javob sirlari</p>
            <ul className="mt-3 space-y-2.5 text-[13px] leading-relaxed text-ink-2">
              <li>
                <b className="text-ink">STAR:</b> vaziyat → vazifa → harakat → natija.
              </li>
              <li>
                <b className="text-ink">Raqamlar:</b> “30% tezlashtirdim” “yaxshiladim”dan kuchliroq.
              </li>
              <li>
                <b className="text-ink">“Men”:</b> o‘z hissangizni aniq ayting.
              </li>
              <li>
                <b className="text-ink">Hajm:</b> 60–150 so‘z, 1–2 daqiqa.
              </li>
            </ul>
          </Card>
          <Card pop className="p-5">
            <p className="flex items-center gap-2 text-[15px] font-bold">
              <History className="size-4" /> Oxirgi urinishlar
            </p>
            {history.length ? (
              <ul className="mt-3 space-y-1">
                {history.map((h) => (
                  <li key={h.at}>
                    <button
                      onClick={() => {
                        setQuestion(h.question);
                        setAnswer(h.answer);
                        setLanguage(h.language);
                        setRole(h.role);
                        setResult({ data: h.result, ai: h.ai });
                        setNotice(null);
                      }}
                      className="-mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 text-left hover:bg-canvas"
                    >
                      <span
                        className={cn(
                          "grid h-7 min-w-9 place-items-center rounded-md text-xs font-bold tabular",
                          h.result.score >= 70 ? "bg-good-soft text-good" : h.result.score >= 50 ? "bg-warn-soft text-warn" : "bg-bad-soft text-bad",
                        )}
                      >
                        {Math.round(h.result.score)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold">{h.question}</span>
                        <span className="block text-[11px] text-muted">{formatDate(h.at)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[13px] text-muted">Hali urinish yo‘q.</p>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}

export default function WorkshopPage() {
  return (
    <Suspense>
      <Workshop />
    </Suspense>
  );
}
