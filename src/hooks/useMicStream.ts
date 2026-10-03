"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Microphone-only stream, requested on demand and stopped on unmount. */
export function useMicStream() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<MediaStream | null>(null);

  const request = useCallback(async () => {
    if (ref.current) return ref.current;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Bu brauzer mikrofonga ulana olmaydi.");
      return null;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      ref.current = s;
      setStream(s);
      setError(null);
      return s;
    } catch {
      setError("Mikrofonga ruxsat berilmadi. Manzil satridagi belgidan ruxsat bering.");
      return null;
    }
  }, []);

  useEffect(() => () => ref.current?.getTracks().forEach((t) => t.stop()), []);

  return { stream, error, request };
}
