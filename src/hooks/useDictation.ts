"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { InterviewLanguage } from "@/lib/types";
import { LANGUAGES } from "@/lib/catalog";
import { useStatus } from "./useVoice";
import { useSpeechRecognition, useSpeechSupport } from "./useSpeechRecognition";
import { serverSttSupported, useServerStt } from "./useServerStt";

/** server = UzbekVoice via /api/stt; browser = Web Speech API. */
export type DictationMode = "server" | "browser" | "none";

const noop = () => () => {};

export function useDictationMode(lang: InterviewLanguage): DictationMode {
  const status = useStatus();
  const browser = useSpeechSupport();
  const worklet = useSyncExternalStore(noop, serverSttSupported, () => false);
  if (worklet && status?.stt.includes(lang)) return "server";
  return browser ? "browser" : "none";
}

/** Appends a recognised phrase to an answer, tidying Uzbek apostrophes and sentence starts. */
export function appendPhrase(base: string, phrase: string, lang: InterviewLanguage): string {
  let t = phrase.trim();
  if (!t) return base;
  if (lang === "uz") t = t.replace(/([oOgG])['`ʻʼ’‘]/g, "$1‘").replace(/(\p{L})['`ʻ](?=\p{L})/gu, "$1’");
  if (!base.trim() || /[.!?]\s*$/.test(base)) t = t.charAt(0).toUpperCase() + t.slice(1);
  const sep = base && !/\s$/.test(base) ? " " : "";
  return `${base}${sep}${t}`;
}

/**
 * One dictation API over both engines. `onPhrase(text, tag)` receives each
 * recognised phrase with the tag given to `start` (the question id), so late
 * results still land on the right answer.
 */
export function useDictation(lang: InterviewLanguage, stream: MediaStream | null, onPhrase: (text: string, tag: string) => void) {
  const mode = useDictationMode(lang);
  const server = useServerStt(stream, onPhrase);
  const browser = useSpeechRecognition(onPhrase, LANGUAGES[lang].speech);
  const active = mode === "server" ? server : browser;

  const start = useCallback(
    (tag: string) => {
      if (mode === "server") void server.start(tag);
      else if (mode === "browser") browser.start(tag);
    },
    [mode, server, browser],
  );

  const flush = useCallback(async () => {
    if (mode === "server") await server.flush();
    else browser.stop();
  }, [mode, server, browser]);

  return {
    mode,
    supported: mode !== "none",
    listening: active.listening,
    interim: mode === "browser" ? browser.interim : "",
    /** Phrases still being transcribed (server mode). */
    pending: mode === "server" ? server.pending : 0,
    error: active.error,
    start,
    stop: active.stop,
    flush,
  };
}
