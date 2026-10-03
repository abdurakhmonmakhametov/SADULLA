"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CornerDownRight, Flag, Gauge, Info, Lightbulb, Timer, Mic, Square, Video, VideoOff, Volume2, VolumeX, X } from "lucide-react";
import type { Answer, Interview, InterviewLanguage, Question } from "@/lib/types";
import { flushSaves, newId, updateInterview } from "@/lib/storage";
import { formatDuration, wordCount } from "@/lib/format";
import { paceLabel, speechStats } from "@/lib/speech";
import { cn } from "@/lib/cn";
import { useAudioLevel } from "@/hooks/useMediaStream";
import { appendPhrase, useDictation } from "@/hooks/useDictation";
import { useVoice, type VoiceGender } from "@/hooks/useVoice";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { Spinner } from "../ui/Spinner";
import { LevelMeter, VideoTile } from "./VideoTile";
import { ScrollCharacter } from "../ui/ScrollCharacter";

type Phase = "speaking" | "listening" | "transcribing" | "thinking" | "your-turn";

const PHASE_TEXT: Record<Phase, string> = {
  speaking: "Savol o‘qilmoqda…",
  listening: "Gapiring — tinglayapman",
  transcribing: "Matnga aylantirilmoqda…",
  thinking: "O‘ylayapman…",
  "your-turn": "Mikrofonni bosib javob bering",
};

export function LiveSession({
  interview,
  stream,
  lang,
  gender,
}: {
  interview: Interview;
  stream: MediaStream | null;
  lang: InterviewLanguage;
  gender: VoiceGender;
}) {
  const router = useRouter();
  const { questions, config } = interview;
  const index = Math.min(interview.currentIndex, questions.length - 1);
  const q = questions[index];
  const isLast = index === questions.length - 1;
  const mainNumber = questions.slice(0, index + 1).filter((x) => x.kind === "main").length;
  const mainTotal = questions.filter((x) => x.kind === "main").length;

  // Answers live in a ref (source of truth for async code) mirrored into state for rendering.
  const [initialDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(interview.answers).map(([k, a]) => [k, a.transcript])),
  );
  const draftsRef = useRef(initialDrafts);
  const [drafts, setDraftsState] = useState(initialDrafts);
  const setDraft = useCallback((id: string, update: (prev: string) => string) => {
    draftsRef.current = { ...draftsRef.current, [id]: update(draftsRef.current[id] ?? "") };
    setDraftsState(draftsRef.current);
  }, []);
  const durations = useRef<Record<string, number>>(
    Object.fromEntries(Object.entries(interview.answers).map(([k, a]) => [k, a.durationSec])),
  );
  const draft = drafts[q.id] ?? "";

  const [voiceOn, setVoiceOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [hintFor, setHintFor] = useState<string | null>(null);
  const showHint = hintFor === q.id;
  const [thinking, setThinking] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  /** Seconds spoken on the current question (for the answer timer and pace). */
  const [spoken, setSpoken] = useState(0);
  const [timeUpFor, setTimeUpFor] = useState<string | null>(null);
  const limit = config.timeLimitSec ?? 0;
  const qIdRef = useRef(q.id);
  const scrollRef = useRef<HTMLDivElement>(null);

  const level = useAudioLevel(stream);
  const voice = useVoice(lang, gender);
  const dictation = useDictation(
    lang,
    stream,
    useCallback((text: string, tag: string) => setDraft(tag, (prev) => appendPhrase(prev, text, lang)), [setDraft, lang]),
  );

  // Time spent listening per question.
  const listenStart = useRef<{ id: string; at: number } | null>(null);
  const flushListening = useCallback((keepGoing: boolean) => {
    const s = listenStart.current;
    if (!s) return;
    durations.current[s.id] = (durations.current[s.id] ?? 0) + (Date.now() - s.at) / 1000;
    listenStart.current = keepGoing ? { id: s.id, at: Date.now() } : null;
  }, []);
  useEffect(() => {
    if (dictation.listening) listenStart.current = { id: q.id, at: Date.now() };
    else flushListening(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dictation.listening]);

  useEffect(() => {
    const t = setInterval(() => {
      setElapsed((e) => e + 1);
      const id = qIdRef.current;
      const s = listenStart.current;
      setSpoken((durations.current[id] ?? 0) + (s && s.id === id ? (Date.now() - s.at) / 1000 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    qIdRef.current = q.id;
    setSpoken(durations.current[q.id] ?? 0);
  }, [q.id]);

  // Answer time limit: stop the mic when the time is up.
  useEffect(() => {
    if (limit && spoken >= limit && dictation.listening) {
      dictation.stop();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeUpFor(q.id);
    }
  }, [limit, spoken, dictation, q.id]);

  // Camera on/off without dropping the stream.
  useEffect(() => {
    stream?.getVideoTracks().forEach((t) => (t.enabled = cameraOn));
  }, [stream, cameraOn]);

  // Latest callbacks for use inside async continuations.
  const live = useRef({ dictation, voice, qId: q.id });
  useEffect(() => {
    live.current = { dictation, voice, qId: q.id };
  });

  const startListening = useCallback(() => {
    live.current.voice.cancel();
    live.current.dictation.start(live.current.qId);
  }, []);

  /** Read the question aloud, then hand the floor to the candidate automatically. */
  const askQuestion = useCallback((text: string) => {
    live.current.dictation.stop();
    live.current.voice.speak(text, () => live.current.dictation.start(live.current.qId));
  }, []);

  const voiceOnRef = useRef(voiceOn);
  useEffect(() => {
    voiceOnRef.current = voiceOn;
  }, [voiceOn]);

  useEffect(() => {
    if (!voice.ready) return;
    if (voiceOnRef.current && voice.available) askQuestion(q.text);
    else if (dictation.supported) startListening();
    return () => live.current.voice.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.id, voice.ready, voice.engine]);

  // Fetch the next question's audio while the candidate is answering.
  const nextText = questions[index + 1]?.text;
  const preload = voice.preload;
  useEffect(() => {
    if (nextText) preload(nextText);
  }, [nextText, preload]);

  const phase: Phase = thinking
    ? "thinking"
    : voice.speaking
      ? "speaking"
      : dictation.listening
        ? "listening"
        : dictation.pending > 0
          ? "transcribing"
          : "your-turn";

  function buildAnswers(): Record<string, Answer> {
    const d = draftsRef.current;
    const ids = new Set([...Object.keys(d), ...Object.keys(durations.current)]);
    const out: Record<string, Answer> = {};
    for (const id of ids) out[id] = { transcript: d[id] ?? "", durationSec: Math.round(durations.current[id] ?? 0) };
    return out;
  }

  function persist(patch: Partial<Interview> = {}) {
    flushListening(true);
    updateInterview(interview.id, (i) => ({ ...i, answers: buildAnswers(), status: "in-progress", ...patch }));
  }

  // Save shortly after each change so a refresh never loses an answer.
  useEffect(() => {
    const t = setTimeout(() => persist(), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts]);

  /** Stop audio and wait until every spoken phrase has become text. */
  async function settle() {
    voice.cancel();
    flushListening(false);
    await dictation.flush();
  }

  const followUpCap = Math.ceil(mainTotal / 3);
  const followUpsUsed = questions.filter((x) => x.kind === "follow-up").length;

  async function maybeFollowUp(answer: string): Promise<Question | null> {
    if (!config.followUps || q.kind !== "main" || followUpsUsed >= followUpCap) return null;
    if (questions[index + 1]?.parentId === q.id) return null;
    if (wordCount(answer) < 8) return null;
    try {
      const res = await fetch("/api/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          question: q.text,
          answer,
          upcoming: questions.slice(index + 1).filter((x) => x.kind === "main").map((x) => x.text),
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { followUp: string | null };
      if (!data.followUp) return null;
      return { id: newId(), text: data.followUp, hint: "Ko‘tarilgan aniq masalaga aniq misol bilan javob bering.", kind: "follow-up", parentId: q.id };
    } catch {
      return null;
    }
  }

  async function next() {
    if (thinking) return;
    setThinking(true);
    try {
      await settle();
      const follow = await maybeFollowUp(draftsRef.current[q.id] ?? "");
      if (follow) {
        persist({ questions: [...questions.slice(0, index + 1), follow, ...questions.slice(index + 1)], currentIndex: index + 1 });
      } else if (isLast) {
        persist();
        setConfirmFinish(true);
      } else {
        persist({ currentIndex: index + 1 });
      }
    } finally {
      setThinking(false);
    }
  }

  async function previous() {
    if (index === 0 || thinking) return;
    await settle();
    persist({ currentIndex: index - 1 });
  }

  async function leave(to: string) {
    setThinking(true);
    await settle();
    persist();
    flushSaves();
    router.push(to);
  }

  function toggleMic() {
    if (dictation.listening) dictation.stop();
    else startListening();
  }

  // Keyboard: Space toggles the mic (outside the text box), Ctrl/Cmd+Enter moves on.
  const keys = useRef({ toggleMic, next });
  useEffect(() => {
    keys.current = { toggleMic, next };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement;
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void keys.current.next();
      } else if (e.code === "Space" && !typing && !(e.target instanceof HTMLButtonElement) && !document.querySelector("dialog[open]")) {
        e.preventDefault();
        keys.current.toggleMic();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const unanswered = questions.filter((x) => !(drafts[x.id] ?? "").trim()).length;
  const words = wordCount(draft);
  const stats = speechStats(draft, spoken);
  const pace = paceLabel(stats.wpm);
  const timeLeft = limit ? Math.max(0, limit - spoken) : 0;
  const isPart2 = /^Part 2 · /.test(q.text);
  const questionText = q.text.replace(/^Part \d · /, "");
  const part = q.text.match(/^(Part \d) · /)?.[1];
  const finishHere = isLast && !(config.followUps && q.kind === "main");

  return (
    <div ref={scrollRef} className="scroll-native-hidden fixed inset-0 z-50 flex flex-col overflow-y-auto bg-canvas">
      <ScrollCharacter target={scrollRef} className="z-[70]" />
      {/* Top bar: exit · progress · time · finish */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <button
            onClick={() => setConfirmExit(true)}
            aria-label="Chiqish"
            className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-md)] border border-line text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
          >
            <X className="size-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2 text-xs font-semibold">
              <span className="truncate">{config.role}</span>
              <span className="shrink-0 tabular text-muted">
                {index + 1} / {questions.length} · {formatDuration(elapsed)}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken" aria-hidden>
              <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setConfirmFinish(true)} icon={<Flag className="size-3.5" />} className="px-3 sm:px-4">
            <span className="hidden sm:inline">Yakunlash</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-5 sm:py-6">
        {/* Question */}
        <section className="pop-card rounded-[var(--radius-lg)] bg-paper p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            {q.kind === "follow-up" ? (
              <span className="inline-flex h-6 items-center gap-1 rounded-md bg-lime-soft px-2 text-xs font-bold text-lime-ink">
                <CornerDownRight className="size-3.5" /> Qo‘shimcha savol
              </span>
            ) : (
              <span className="inline-flex h-6 items-center rounded-md bg-sunken px-2 text-xs font-bold text-ink-2">
                Savol {mainNumber} / {mainTotal}
              </span>
            )}
            {part && <span className="inline-flex h-6 items-center rounded-md border border-line px-2 text-xs font-bold text-ink-2">{part}</span>}
            <div className="ml-auto flex gap-1">
              <button
                onClick={() => askQuestion(q.text)}
                disabled={!voice.available || thinking}
                className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 text-[13px] font-semibold text-muted transition-colors hover:bg-sunken hover:text-ink disabled:opacity-40"
              >
                <Volume2 className="size-4" /> <span className="hidden sm:inline">Qayta eshitish</span>
              </button>
              <button
                onClick={() => setHintFor(showHint ? null : q.id)}
                aria-expanded={showHint}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 text-[13px] font-semibold transition-colors hover:bg-sunken hover:text-ink",
                  showHint ? "bg-sunken text-ink" : "text-muted",
                )}
              >
                <Lightbulb className="size-4" /> <span className="hidden sm:inline">Maslahat</span>
              </button>
            </div>
          </div>
          <h1 key={q.id} className="mt-4 animate-rise text-[20px] font-bold leading-[1.4] tracking-tight text-ink sm:text-[23px]">
            {questionText}
          </h1>
          {showHint && (
            <p className="mt-4 flex animate-fade gap-2.5 rounded-[var(--radius-md)] bg-canvas px-3.5 py-3 text-[13px] leading-relaxed text-ink-2">
              <Info className="mt-0.5 size-4 shrink-0 text-muted" /> {q.hint}
            </p>
          )}
        </section>

        {/* Answer */}
        <section className="pop-card flex flex-1 flex-col rounded-[var(--radius-lg)] bg-paper p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p
                aria-live="polite"
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-[13px] font-semibold transition-colors",
                  phase === "listening" ? "bg-good-soft text-good" : "bg-sunken text-ink-2",
                )}
              >
                {phase === "speaking" && (
                  <span className="speaking-bars flex h-3 items-center gap-[2px]">
                    <span className="h-3" />
                    <span className="h-3" />
                    <span className="h-3" />
                    <span className="h-3" />
                  </span>
                )}
                {phase === "listening" && <LevelMeter level={level} />}
                {(phase === "transcribing" || phase === "thinking") && <Spinner className="size-3" />}
                {phase === "your-turn" && !dictation.supported ? "Javobingizni yozing" : PHASE_TEXT[phase]}
              </p>
              {isPart2 && <p className="mt-2 text-[13px] font-medium text-muted">Bir daqiqagacha o‘ylab oling, keyin 1–2 daqiqa gapiring.</p>}
              {limit > 0 && (
                <div className="mt-3 max-w-56">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="inline-flex items-center gap-1.5 text-muted">
                      <Timer className="size-3.5" /> Javob vaqti
                    </span>
                    <span className={cn("tabular", timeLeft <= 10 ? "text-bad" : "text-ink")}>
                      {formatDuration(Math.min(spoken, limit))} / {formatDuration(limit)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken">
                    <div
                      className={cn("h-full rounded-full transition-[width] duration-1000 ease-linear", timeLeft <= 10 ? "bg-bad" : "bg-lime")}
                      style={{ width: `${Math.min(100, (spoken / limit) * 100)}%` }}
                    />
                  </div>
                  {timeUpFor === q.id && <p className="mt-1.5 text-xs font-semibold text-bad">Vaqt tugadi — keyingi savolga o‘ting.</p>}
                </div>
              )}
            </div>
            {/* Camera thumbnail */}
            <button
              onClick={() => setCameraOn((v) => !v)}
              aria-label={cameraOn ? "Kamerani o‘chirish" : "Kamerani yoqish"}
              className="group relative w-28 shrink-0 sm:w-36"
            >
              <VideoTile stream={stream} hidden={!cameraOn} compact className="aspect-[4/3]" />
              <span className="absolute bottom-1 right-1 grid size-6 place-items-center rounded-md bg-paper/90 text-ink shadow opacity-90 transition-opacity group-hover:opacity-100">
                {cameraOn ? <Video className="size-3" /> : <VideoOff className="size-3" />}
              </span>
            </button>
          </div>

          <textarea
            id="answer"
            aria-label="Javobingiz"
            value={draft}
            onChange={(e) => {
              if (dictation.listening) dictation.stop();
              setDraft(q.id, () => e.target.value);
            }}
            placeholder={
              dictation.supported
                ? "Gapirgan so‘zlaringiz shu yerda paydo bo‘ladi. Kerak bo‘lsa, tahrirlashingiz mumkin."
                : "Javobingizni shu yerga yozing."
            }
            className="mt-3 min-h-40 w-full flex-1 resize-none rounded-[var(--radius-md)] border border-line bg-canvas px-4 py-3 text-[15px] leading-relaxed text-ink placeholder:text-muted/80 focus:border-line-strong focus:bg-paper focus:outline-none focus-visible:outline-none"
          />
          <div className="mt-2 flex min-h-5 items-start justify-between gap-3 text-[13px]">
            <span className="italic text-muted" aria-live="polite">
              {dictation.interim}
            </span>
            <span className="shrink-0 text-[11px] font-semibold tabular text-muted">{words} so‘z</span>
          </div>
          {words > 0 && (
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-sunken px-2 py-1 text-ink-2" title="Daqiqasiga so‘z — 110–160 ideal">
                <Gauge className="size-3.5" />
                {stats.wpm ? `${stats.wpm} so‘z/daq` : "Sur’at: —"}
                {pace && <span className={pace.tone === "good" ? "text-good" : "text-warn"}>· {pace.label}</span>}
              </span>
              <span
                className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-1", stats.fillers > 2 ? "bg-warn-soft text-warn" : "bg-sunken text-ink-2")}
                title="“ee”, “anu”, “xullas” kabi so‘zlar"
              >
                To‘ldiruvchi so‘zlar: {stats.fillers}
                {stats.topFillers.length > 0 && <span className="font-medium opacity-80">({stats.topFillers.map(([f]) => f).join(", ")})</span>}
              </span>
            </div>
          )}
          {dictation.error && <p className="mt-1 text-[13px] font-medium text-bad">{dictation.error}</p>}
        </section>
      </main>

      {/* Controls */}
      <footer className="sticky bottom-0 z-20 border-t border-line bg-paper">
        <div className="mx-auto grid max-w-3xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => void previous()} disabled={index === 0 || thinking} aria-label="Oldingi savol" title="Oldingi savol">
              <ArrowLeft className="size-4" strokeWidth={2.5} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={!voice.available}
              onClick={() => {
                if (voiceOn) voice.cancel();
                setVoiceOn((v) => !v);
              }}
              aria-label={voiceOn ? "Ovozni o‘chirish" : "Ovozni yoqish"}
              title={!voice.available ? "Bu brauzerda ovoz yo‘q" : voiceOn ? "Savollarni o‘qish yoqilgan" : "Savollarni o‘qish o‘chirilgan"}
            >
              {voiceOn && voice.available ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </Button>
          </div>

          {dictation.supported ? (
            <button
              onClick={toggleMic}
              disabled={thinking}
              aria-label={dictation.listening ? "Yozishni to‘xtatish" : "Ovoz bilan javob berish"}
              title="Bo‘sh joy (Space)"
              className={cn(
                "relative grid size-14 place-items-center rounded-full shadow-[0_4px_14px_rgb(11_19_36/0.18)] transition-colors disabled:opacity-40",
                dictation.listening ? "bg-bad text-white" : "bg-ink text-white hover:bg-[#1c2740]",
              )}
            >
              {dictation.listening && <span className="absolute -inset-1 animate-ping rounded-full border-2 border-bad/50 [animation-duration:1.6s]" />}
              {dictation.listening ? <Square className="relative size-4 fill-current" /> : <Mic className="size-[22px]" strokeWidth={2.25} />}
            </button>
          ) : (
            <span />
          )}

          <div className="flex justify-end">
            <Button
              variant={finishHere ? "dark" : "primary"}
              onClick={() => void next()}
              disabled={thinking}
              title="Ctrl + Enter"
              iconRight={thinking ? <Spinner /> : finishHere ? <Flag className="size-4" /> : <ArrowRight className="size-4" strokeWidth={2.5} />}
              className="px-4 sm:px-5"
            >
              {finishHere ? "Yakunlash" : "Keyingi"}
            </Button>
          </div>
        </div>
      </footer>

      <Dialog
        open={confirmFinish}
        onClose={() => setConfirmFinish(false)}
        title="Yakunlab, natijani olasizmi?"
        description={
          unanswered > 0
            ? `${unanswered} ta savol hali javobsiz va o‘tkazib yuborilgan deb baholanadi.`
            : "Javoblaringiz tahlil qilinib, baholanadi. Bu taxminan 20–40 soniya davom etadi."
        }
      >
        <Button variant="secondary" onClick={() => setConfirmFinish(false)}>
          Davom etaman
        </Button>
        <Button variant="dark" onClick={() => void leave(`/interview/${interview.id}/report`)} disabled={thinking} icon={<Flag className="size-4" />}>
          Natijani olish
        </Button>
      </Dialog>

      <Dialog
        open={confirmExit}
        onClose={() => setConfirmExit(false)}
        title="Suhbatdan chiqasizmi?"
        description="Javoblaringiz saqlangan. Keyinroq kabinetingizdan shu savoldan davom ettirishingiz mumkin."
      >
        <Button variant="secondary" onClick={() => setConfirmExit(false)}>
          Qolaman
        </Button>
        <Button variant="dark" onClick={() => void leave("/")} disabled={thinking}>
          Saqlab chiqish
        </Button>
      </Dialog>
    </div>
  );
}
