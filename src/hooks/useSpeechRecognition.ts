"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/* Minimal Web Speech API typings (not in lib.dom). */
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noopSubscribe = () => () => {};

export function useSpeechSupport() {
  return useSyncExternalStore(
    noopSubscribe,
    () => getCtor() !== null,
    () => false,
  );
}

export const STT_ERRORS: Record<string, string> = {
  "not-allowed": "Mikrofonga ruxsat berilmadi. Manzil satridagi belgidan ruxsat bering yoki javobni yozing.",
  "service-not-allowed": "Bu brauzerda nutqni aniqlash o‘chirilgan. Javobni yozib kiritishingiz mumkin.",
  network: "Nutqni aniqlash uchun internet kerak. Javobni yozib kiritishingiz mumkin.",
  "audio-capture": "Mikrofon topilmadi.",
  "language-not-supported": "Bu brauzer tanlangan tilni tanimaydi. Google Chrome’dan foydalaning yoki javobni yozing.",
};

/**
 * Browser dictation (Web Speech API). Each finalised phrase goes to
 * `onPhrase(text, tag)`, where `tag` is whatever was passed to `start`;
 * `interim` holds the in-progress phrase for live display.
 */
export function useSpeechRecognition(onPhrase: (text: string, tag: string) => void, lang = "en-US") {
  const supported = useSpeechSupport();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const wantRef = useRef(false);
  const onPhraseRef = useRef(onPhrase);
  useEffect(() => {
    onPhraseRef.current = onPhrase;
  }, [onPhrase]);

  const stop = useCallback(() => {
    wantRef.current = false;
    recRef.current?.stop();
    setListening(false);
    setInterim("");
  }, []);

  const start = useCallback(
    (tag: string) => {
      const Ctor = getCtor();
      if (!Ctor) return;
      recRef.current?.abort();
      setError(null);

      const rec = new Ctor();
      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onresult = (e) => {
        let interimText = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) onPhraseRef.current(r[0].transcript, tag);
          else interimText += r[0].transcript;
        }
        setInterim(interimText);
      };
      rec.onerror = (e) => {
        if (e.error === "no-speech" || e.error === "aborted") return;
        setError(STT_ERRORS[e.error] ?? `Nutqni aniqlashda xato: ${e.error}`);
        wantRef.current = false;
      };
      rec.onend = () => {
        // Chrome ends sessions after silence; keep going while the user wants to dictate.
        if (wantRef.current && recRef.current === rec) {
          try {
            rec.start();
            return;
          } catch {
            /* fall through */
          }
        }
        if (recRef.current === rec) {
          setListening(false);
          setInterim("");
        }
      };

      recRef.current = rec;
      wantRef.current = true;
      try {
        rec.start();
        setListening(true);
      } catch {
        setError("Mikrofonni yoqib bo‘lmadi. Qayta urinib ko‘ring.");
      }
    },
    [lang],
  );

  useEffect(
    () => () => {
      wantRef.current = false;
      recRef.current?.abort();
    },
    [],
  );

  return { supported, listening, interim, error, start, stop };
}
