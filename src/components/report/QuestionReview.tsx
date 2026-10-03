"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, CornerDownRight, PenLine, Square, Volume2 } from "lucide-react";
import type { Answer, Question, QuestionFeedback } from "@/lib/types";
import { formatDuration, wordCount } from "@/lib/format";
import { speechStats } from "@/lib/speech";
import { cn } from "@/lib/cn";
import type { useVoice } from "@/hooks/useVoice";
import { ScorePill } from "../ui/Score";

type Voice = ReturnType<typeof useVoice>;

export function ListenButton({ voice, text, id, playing, onPlaying }: { voice: Voice; text: string; id: string; playing: string | null; onPlaying: (id: string | null) => void }) {
  if (!voice.available) return null;
  const active = playing === id && voice.speaking;
  return (
    <button
      onClick={() => {
        if (active) {
          voice.cancel();
          onPlaying(null);
        } else {
          onPlaying(id);
          voice.speak(text, () => onPlaying(null));
        }
      }}
      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line-strong bg-paper px-2.5 text-xs font-semibold transition-colors hover:bg-sunken"
    >
      {active ? <Square className="size-3 fill-current" /> : <Volume2 className="size-3.5" />}
      {active ? "To‘xtatish" : "Tinglash"}
    </button>
  );
}

export function QuestionReview({
  question,
  label,
  answer,
  feedback,
  defaultOpen,
  workshopHref,
  voice,
  playing,
  onPlaying,
}: {
  question: Question;
  label: string;
  answer?: Answer;
  feedback?: QuestionFeedback;
  defaultOpen?: boolean;
  workshopHref?: string;
  voice: Voice;
  playing: string | null;
  onPlaying: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const transcript = answer?.transcript.trim() ?? "";
  const id = `q-${question.id}`;

  return (
    <li className={cn(question.kind === "follow-up" && "bg-canvas")}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-canvas sm:px-6"
      >
        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-sunken text-xs font-bold text-ink-2">
          {question.kind === "follow-up" ? <CornerDownRight className="size-3.5" /> : label}
        </span>
        <span className="min-w-0 flex-1">
          {question.kind === "follow-up" && <span className="eyebrow mb-1 block text-lime-ink">Qo‘shimcha savol</span>}
          <span className="block text-[15px] font-semibold leading-snug text-ink">{question.text}</span>
          {!transcript && <span className="mt-1 block text-xs font-semibold text-bad">Javob berilmagan</span>}
        </span>
        {feedback && <ScorePill score={feedback.score} />}
        <ChevronDown className={cn("mt-1.5 size-4 shrink-0 text-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div id={id} className="grid animate-fade gap-5 px-5 pb-6 sm:pl-[4.5rem] sm:pr-6">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="eyebrow">Sizning javobingiz</p>
              {transcript && (
                <span className="text-[11px] font-semibold text-muted tabular">
                  {wordCount(transcript)} so‘z{answer?.durationSec ? ` · ${formatDuration(answer.durationSec)} gapirildi` : ""}
                  {(() => {
                    const st = speechStats(transcript, answer?.durationSec ?? 0);
                    return `${st.wpm ? ` · ${st.wpm} so‘z/daq` : ""}${st.fillers ? ` · ${st.fillers} to‘ldiruvchi` : ""}`;
                  })()}
                </span>
              )}
            </div>
            <blockquote className="mt-2 rounded-[var(--radius-md)] border-l-[3px] border-line-strong bg-canvas px-4 py-3 text-sm leading-relaxed text-ink-2">
              {transcript || <span className="italic text-muted">Javob yozib olinmagan.</span>}
            </blockquote>
          </div>
          {feedback && (
            <>
              <div>
                <p className="eyebrow">Fikr-mulohaza</p>
                <p className="mt-2 text-sm leading-relaxed text-ink">{feedback.feedback}</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-line bg-canvas p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="eyebrow text-lime-ink">Kuchliroq javob namunasi</p>
                  <ListenButton voice={voice} text={feedback.betterAnswer} id={question.id} playing={playing} onPlaying={onPlaying} />
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink">{feedback.betterAnswer}</p>
              </div>
              {workshopHref && (
                <Link href={workshopHref} className="no-print inline-flex items-center gap-1.5 self-start text-[13px] font-semibold text-lime-ink hover:underline">
                  <PenLine className="size-3.5" /> Shu javobni ustaxonada qayta ishlash
                </Link>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}
