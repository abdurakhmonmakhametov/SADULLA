import type { Answer } from "./types";

/** Filler words in Uzbek and English ("ee", "anu", "xullas", "um", "like"…). */
export const FILLERS =
  /(?:^|[\s,.;!?])(um+|uh+|erm|like|you know|basically|actually|sort of|kind of|i mean|e+|ee+|hm+|xm+|anu|xullas|mana|endi|haligi|nima desam|qisqasi|aslida)(?=$|[\s,.;!?])/gi;

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export interface SpeechStats {
  words: number;
  /** Words per minute of speaking time; null when there's too little audio to judge. */
  wpm: number | null;
  fillers: number;
  /** Most frequent fillers, e.g. [["ee", 4], ["xullas", 2]]. */
  topFillers: [string, number][];
}

export function speechStats(text: string, durationSec: number): SpeechStats {
  const counts = new Map<string, number>();
  for (const m of text.matchAll(FILLERS)) {
    const f = m[1].toLowerCase().replace(/^e{2,}$/, "ee");
    counts.set(f, (counts.get(f) ?? 0) + 1);
  }
  const w = words(text);
  return {
    words: w,
    wpm: durationSec >= 10 && w >= 5 ? Math.round(w / (durationSec / 60)) : null,
    fillers: [...counts.values()].reduce((a, b) => a + b, 0),
    topFillers: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
  };
}

/** Combined stats over every answer of an interview. */
export function interviewSpeechStats(answers: Record<string, Answer>): SpeechStats & { answered: number; seconds: number } {
  const list = Object.values(answers).filter((a) => a.transcript.trim());
  const text = list.map((a) => a.transcript).join(" ");
  const seconds = list.reduce((t, a) => t + a.durationSec, 0);
  return { ...speechStats(text, seconds), answered: list.length, seconds };
}

/** Plain-language read of a speaking pace. */
export function paceLabel(wpm: number | null): { label: string; tone: "good" | "warn" } | null {
  if (wpm === null) return null;
  if (wpm < 80) return { label: "Sekin", tone: "warn" };
  if (wpm > 170) return { label: "Juda tez", tone: "warn" };
  return { label: "Me’yorida", tone: "good" };
}
