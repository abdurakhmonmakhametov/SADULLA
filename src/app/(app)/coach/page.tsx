"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bot, FileText, PlugZap, RotateCcw, SendHorizontal, Square, Volume2 } from "lucide-react";
import { PageHeader } from "@/components/shell/AppShell";
import { useUser } from "@/components/UserProvider";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RichText } from "@/components/ui/RichText";
import { Spinner } from "@/components/ui/Spinner";
import { useStatus, useVoice } from "@/hooks/useVoice";
import { INTERVIEW_TYPES } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { useInterview } from "@/lib/storage";
import type { Interview } from "@/lib/types";

type Msg = { role: "user" | "assistant"; content: string; offline?: boolean };

const STORE_KEY = "suhbatdosh.coach";

const STARTERS = [
  "“O‘zingiz haqingizda gapirib bering” savoliga javob tayyorlashga yordam bering",
  "STAR usulini misol bilan tushuntiring",
  "Maosh haqida qanday gaplashish kerak?",
  "Suhbat oxirida qanday savollar bersam bo‘ladi?",
  "Hayajonni qanday boshqarsam bo‘ladi?",
  "Junior frontend suhbatiga 1 haftalik tayyorgarlik rejasini tuzing",
];

function reportContext(i: Interview): string | undefined {
  const r = i.report;
  if (!r) return undefined;
  return [
    `Role: ${i.config.role} (${INTERVIEW_TYPES[i.config.type].label}, level ${i.config.level})`,
    `Overall ${r.overall}/100 — communication ${r.communication}, knowledge ${r.technical}, confidence ${r.confidence}, answer quality ${r.answerQuality}`,
    `Summary: ${r.summary}`,
    `Weaknesses: ${r.weaknesses.join("; ")}`,
    `Advice given: ${r.advice.join("; ")}`,
    `Lowest-scoring questions: ${[...r.questions]
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map((q) => `"${i.questions.find((x) => x.id === q.questionId)?.text ?? ""}" (${q.score})`)
      .join("; ")}`,
  ].join("\n");
}

function readHistory(): Msg[] {
  try {
    const v = JSON.parse(localStorage.getItem(STORE_KEY) ?? "[]") as Msg[];
    return Array.isArray(v) ? v.slice(-40) : [];
  } catch {
    return [];
  }
}

function Coach() {
  const user = useUser();
  const status = useStatus();
  const params = useSearchParams();
  const fromId = params.get("from") ?? "";
  const from = useInterview(fromId);
  const context = useMemo(() => (from ? reportContext(from) : undefined), [from]);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const voice = useVoice("uz");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    // Restore this browser's conversation after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages(readHistory());
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      /* ignore */
    }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-20).map(({ role, content }) => ({ role, content })), context }),
      });
      const data = (await res.json()) as { reply?: string; source?: string; notice?: string; error?: string };
      if (!res.ok || !data.reply) throw new Error(data.error ?? "Xato");
      setMessages((m) => [...m, { role: "assistant", content: data.reply!, offline: data.source !== "ai" }]);
      if (data.notice) setNotice(data.notice);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Kechirasiz, javob olib bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.", offline: true }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  function toggleSpeak(i: number, text: string) {
    if (speakingIdx === i && voice.speaking) {
      voice.cancel();
      setSpeakingIdx(null);
      return;
    }
    setSpeakingIdx(i);
    voice.speak(text.replace(/\*\*/g, "").replace(/^\s*[-*•]\s+/gm, ""), () => setSpeakingIdx(null));
  }

  return (
    <>
      <PageHeader
        title="AI murabbiy"
        description="Suhbatga tayyorgarlik bo‘yicha istalgan savolingizni bering — javob, misol va reja oling."
        actions={
          messages.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => {
                voice.cancel();
                setMessages([]);
                setNotice(null);
              }}
              icon={<RotateCcw className="size-4" />}
            >
              Yangi suhbat
            </Button>
          )
        }
      />

      {status && !status.ai && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-warn/30 bg-warn-soft px-4 py-3 text-sm">
          <span className="text-ink-2">
            <b className="text-warn">Oflayn rejim.</b> Murabbiy faqat tayyor mavzular bo‘yicha javob beradi.
          </span>
          <Link href="/settings#ai" className="inline-flex items-center gap-1.5 font-semibold text-ink underline underline-offset-4">
            <PlugZap className="size-4" /> AI kalitini ulash
          </Link>
        </div>
      )}
      {context && from && (
        <div className="mb-4 flex items-center gap-3 rounded-[var(--radius-md)] border border-lime bg-lime-soft px-4 py-3 text-sm">
          <FileText className="size-4 shrink-0 text-lime-ink" />
          <span className="text-ink-2">
            Murabbiy <b className="text-ink">“{from.config.role}”</b> suhbatingiz natijasini ({from.report?.overall} ball) biladi — undan maslahat so‘rang.
          </span>
        </div>
      )}

      <Card pop className="flex h-[calc(100dvh-230px)] min-h-[460px] flex-col overflow-hidden">
        <div ref={listRef} className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6" aria-live="polite">
          {messages.length === 0 && (
            <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 py-4 lg:gap-4">
              {/* The coach, pointing at the suggestions. */}
              <div className="relative hidden shrink-0 self-end md:block">
                <Image src="/aipart.png" alt="" width={1024} height={1536} priority sizes="240px" className="relative z-10 h-[330px] w-auto lg:h-[370px]" />
                <span
                  aria-hidden
                  className="absolute -bottom-1 left-[10%] h-5 w-[80%] rounded-[50%] bg-[radial-gradient(closest-side,rgb(11_19_36/0.22),transparent)]"
                />
              </div>
              <div className="flex min-w-0 max-w-xl flex-1 flex-col items-center text-center">
                <span className="grid size-12 place-items-center rounded-full bg-lime text-ink">
                  <Bot className="size-6" />
                </span>
                <p className="mt-4 text-lg font-extrabold tracking-tight">Salom, {user.name.split(" ")[0]}! Qanday yordam beray?</p>
                <p className="mt-1 text-sm text-muted">Quyidagilardan birini tanlang yoki o‘z savolingizni yozing.</p>
                <div className="mt-5 grid w-full gap-2 sm:grid-cols-2">
                  {(context
                    ? [
                        "Natijamga qarab eng zaif tomonimni qanday yaxshilay?",
                        "Eng past ball olgan savolimga yaxshi javob tuzib bering",
                        ...STARTERS.slice(0, 2),
                      ]
                    : STARTERS
                  ).map((s) => (
                    <button
                      key={s}
                      onClick={() => void send(s)}
                      className="rounded-[var(--radius-md)] border border-line bg-paper px-3.5 py-2.5 text-left text-[13px] font-medium text-ink-2 transition-colors hover:border-ink hover:bg-lime-soft hover:text-ink"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="flex justify-end gap-3">
                <div className="max-w-[85%] whitespace-pre-wrap rounded-[var(--radius-lg)] rounded-tr-sm bg-ink px-4 py-2.5 text-[15px] leading-relaxed text-white">
                  {m.content}
                </div>
                <span className="hidden size-8 shrink-0 place-items-center rounded-full bg-sunken text-[11px] font-bold text-ink-2 sm:grid">
                  {initials(user.name)}
                </span>
              </div>
            ) : (
              <div key={i} className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-lime text-ink">
                  <Bot className="size-4" />
                </span>
                <div className="min-w-0 max-w-[85%]">
                  <div className="rounded-[var(--radius-lg)] rounded-tl-sm border border-line bg-canvas px-4 py-3 text-[15px] leading-relaxed text-ink-2">
                    <RichText text={m.content} />
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 pl-1 text-xs text-muted">
                    {voice.available && (
                      <button onClick={() => toggleSpeak(i, m.content)} className="inline-flex items-center gap-1 font-semibold hover:text-ink">
                        {speakingIdx === i && voice.speaking ? <Square className="size-3 fill-current" /> : <Volume2 className="size-3.5" />}
                        {speakingIdx === i && voice.speaking ? "To‘xtatish" : "Tinglash"}
                      </button>
                    )}
                    {m.offline && <span>Oflayn javob</span>}
                  </div>
                </div>
              </div>
            ),
          )}

          {busy && (
            <div className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-lime text-ink">
                <Bot className="size-4" />
              </span>
              <div className="flex items-center gap-2 rounded-[var(--radius-lg)] rounded-tl-sm border border-line bg-canvas px-4 py-3 text-sm text-muted">
                <Spinner className="size-3.5" /> Yozmoqda…
              </div>
            </div>
          )}
        </div>

        {notice && <p className="border-t border-line bg-warn-soft px-4 py-2 text-xs font-medium text-warn">{notice}</p>}

        <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-line bg-paper p-3 sm:p-4">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            placeholder="Savolingizni yozing… (Enter — yuborish, Shift+Enter — yangi qator)"
            aria-label="Xabar"
            maxLength={6000}
            className="max-h-40 min-h-11 flex-1 resize-none rounded-[var(--radius-md)] border border-line-strong bg-paper px-3.5 py-2.5 text-[15px] leading-relaxed text-ink placeholder:text-muted/80 focus:border-ink focus:outline-none field-sizing-content"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Yuborish"
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)] bg-lime text-ink transition-colors hover:bg-lime-strong disabled:opacity-40",
            )}
          >
            <SendHorizontal className="size-5" />
          </button>
        </form>
      </Card>
    </>
  );
}

export default function CoachPage() {
  return (
    <Suspense>
      <Coach />
    </Suspense>
  );
}
