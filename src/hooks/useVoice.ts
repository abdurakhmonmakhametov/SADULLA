"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { InterviewLanguage } from "@/lib/types";

export type VoiceGender = "female" | "male";
/** server = neural voice via /api/tts (UzbekVoice / Azure); browser = native voice; approx = closest language (Turkish for Uzbek). */
export type VoiceEngine = "server" | "browser" | "approx" | "none";

/* ---- shared status (/api/status), fetched once per page load ---- */
export type Status = { ai: boolean; aiProvider?: string | null; tts: InterviewLanguage[]; stt: InterviewLanguage[] };
const OFFLINE: Status = { ai: false, tts: [], stt: [] };
let statusPromise: Promise<Status> | null = null;
let statusValue: Status | null = null;
export function fetchStatus(): Promise<Status> {
  statusPromise ??= fetch("/api/status")
    .then((r) => r.json() as Promise<Status>)
    .catch(() => OFFLINE)
    .then((s) => (statusValue = { ...OFFLINE, ...s }));
  return statusPromise;
}
const statusListeners = new Set<() => void>();
function subscribeStatus(cb: () => void) {
  statusListeners.add(cb);
  void fetchStatus().then(() => statusListeners.has(cb) && cb());
  return () => {
    statusListeners.delete(cb);
  };
}
/** Re-fetch status (e.g. after the AI provider changed) and notify every subscriber. */
export function refreshStatus() {
  statusPromise = null;
  void fetchStatus().then(() => statusListeners.forEach((cb) => cb()));
}
/** Status as a hook; `null` until loaded. */
export function useStatus(): Status | null {
  return useSyncExternalStore(subscribeStatus, () => statusValue, () => null);
}

/* ---- browser voices as an external store ---- */
let voiceList: SpeechSynthesisVoice[] = [];
function subscribeVoices(cb: () => void) {
  if (!("speechSynthesis" in window)) return () => {};
  const update = () => {
    voiceList = window.speechSynthesis.getVoices();
    cb();
  };
  update();
  window.speechSynthesis.addEventListener("voiceschanged", update);
  // Some browsers populate late without firing the event.
  const t = setTimeout(update, 600);
  return () => {
    clearTimeout(t);
    window.speechSynthesis.removeEventListener("voiceschanged", update);
  };
}
const getVoices = () => voiceList;
const NO_VOICES: SpeechSynthesisVoice[] = [];

const FEMALE = /(madina|female|ava|aria|jenny|emma|samantha|zira|susan|libby|sonia|natural.*(f)|google us english|google uk english female|seda|emel)/i;
const MALE = /(sardor|male|andrew|guy|david|mark|ryan|george|tolga|ahmet|google uk english male)/i;

function pickVoice(voices: SpeechSynthesisVoice[], prefix: string, gender: VoiceGender) {
  const pool = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith(prefix));
  if (!pool.length) return undefined;
  const want = gender === "female" ? FEMALE : MALE;
  const natural = (v: SpeechSynthesisVoice) => /natural|neural|online|google/i.test(v.name);
  return (
    pool.find((v) => want.test(v.name) && natural(v)) ??
    pool.find((v) => want.test(v.name)) ??
    pool.find(natural) ??
    pool[0]
  );
}

const strip = (t: string) => t.replace(/^Part \d · /, "");

/* ---- server audio, cached for the whole page session ---- */
const audioCache = new Map<string, Promise<HTMLAudioElement | null>>();

function loadServerAudio(text: string, lang: InterviewLanguage, gender: VoiceGender) {
  const key = `${lang}|${gender}|${strip(text)}`;
  let p = audioCache.get(key);
  if (!p) {
    p = fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: strip(text), lang, gender }),
    })
      .then(async (r) => {
        if (!r.ok) return null;
        const src = r.headers.get("content-type")?.includes("json")
          ? ((await r.json()) as { url: string }).url
          : URL.createObjectURL(await r.blob());
        const audio = new Audio(src);
        audio.preload = "auto"; // start downloading now, so playback is instant
        return audio;
      })
      .catch(() => null);
    audioCache.set(key, p);
    void p.then((a) => a === null && audioCache.delete(key));
  }
  return p;
}

/** Fetch a question's audio ahead of time (no-op when the server can't voice this language). */
export function preloadSpeech(text: string, lang: InterviewLanguage, gender: VoiceGender) {
  void fetchStatus().then((s) => {
    if (s.tts.includes(lang)) void loadServerAudio(text, lang, gender);
  });
}

/**
 * The interviewer's voice. Engine order:
 * Uzbek: server (UzbekVoice) → native browser voice → Turkish approximation → none.
 * English: native browser voice → server (Azure) → none.
 */
export function useVoice(lang: InterviewLanguage, gender: VoiceGender = "female") {
  const supported = useSyncExternalStore(
    () => () => {},
    () => "speechSynthesis" in window,
    () => false,
  );
  const voices = useSyncExternalStore(subscribeVoices, getVoices, () => NO_VOICES);
  const status = useStatus();
  const [speaking, setSpeaking] = useState(false);
  const playing = useRef<HTMLAudioElement | null>(null);
  const token = useRef(0);

  const { engine, voice } = useMemo((): { engine: VoiceEngine; voice?: SpeechSynthesisVoice } => {
    const server = status?.tts.includes(lang) ?? false;
    const native = supported ? pickVoice(voices, lang, gender) : undefined;
    if (lang === "uz" && server) return { engine: "server" };
    if (native) return { engine: "browser", voice: native };
    if (server) return { engine: "server" };
    if (lang === "uz" && supported) {
      const tr = pickVoice(voices, "tr", gender);
      if (tr) return { engine: "approx", voice: tr };
    }
    return { engine: "none" };
  }, [voices, lang, gender, supported, status]);

  const preload = useCallback(
    (text: string) => {
      if (engine === "server") void loadServerAudio(text, lang, gender);
    },
    [engine, lang, gender],
  );

  const cancel = useCallback(() => {
    token.current++;
    if (supported) window.speechSynthesis.cancel();
    playing.current?.pause();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      cancel();
      const my = token.current;
      const finish = () => {
        if (my !== token.current) return;
        setSpeaking(false);
        onDone?.();
      };
      if (engine === "none") {
        onDone?.();
        return;
      }
      setSpeaking(true);
      if (engine === "browser" || engine === "approx") {
        const u = new SpeechSynthesisUtterance(strip(text));
        if (voice) {
          u.voice = voice;
          u.lang = voice.lang;
        }
        u.rate = lang === "uz" ? 0.95 : 0.98;
        u.onend = finish;
        u.onerror = finish;
        window.speechSynthesis.speak(u);
        return;
      }
      void loadServerAudio(text, lang, gender).then(async (audio) => {
        if (my !== token.current) return;
        if (!audio) return finish();
        playing.current = audio;
        audio.currentTime = 0;
        audio.onended = finish;
        audio.onerror = finish;
        try {
          await audio.play();
        } catch {
          finish();
        }
      });
    },
    [cancel, engine, voice, lang, gender],
  );

  useEffect(
    () => () => {
      token.current++;
      playing.current?.pause();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );

  return {
    engine,
    voiceName: voice?.name,
    speaking,
    speak,
    cancel,
    preload,
    /** Status has loaded, so `engine` is final. */
    ready: status !== null,
    available: status !== null && engine !== "none",
  };
}
