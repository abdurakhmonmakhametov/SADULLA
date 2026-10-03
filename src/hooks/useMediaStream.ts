"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type MediaStatus = "idle" | "requesting" | "granted" | "denied" | "unavailable";

const describe = (err: unknown): { status: MediaStatus; message: string } => {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return {
      status: "denied",
      message: "Kamera yoki mikrofonga ruxsat berilmadi. Manzil satridagi kamera belgisini bosing, ruxsat bering va qayta urinib ko‘ring.",
    };
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return { status: "unavailable", message: "Bu qurilmada kamera yoki mikrofon topilmadi." };
  if (name === "NotReadableError")
    return { status: "unavailable", message: "Kamerangiz boshqa dasturda band. Uni yopib, qayta urinib ko‘ring." };
  return { status: "unavailable", message: "Kamera va mikrofonga ulanib bo‘lmadi." };
};

/** Camera + microphone stream, stopped automatically on unmount. */
export function useMediaStream() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<MediaStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const request = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      setError("Bu brauzer kameraga ulana olmaydi. https yoki localhost orqali yangi Chrome yoki Edge’dan foydalaning.");
      return null;
    }
    setStatus("requesting");
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = s;
      setStream(s);
      setStatus("granted");
      return s;
    } catch (err) {
      const d = describe(err);
      setStatus(d.status);
      setError(d.message);
      return null;
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    setStatus("idle");
  }, []);

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  return { stream, status, error, request, stop };
}

/** Live 0–1 input level from a stream's audio track, for meters. */
export function useAudioLevel(stream: MediaStream | null) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) return;
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 60) return;
      last = t;
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += ((v - 128) / 128) ** 2;
      setLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      src.disconnect();
      void ctx.close();
      setLevel(0);
    };
  }, [stream]);

  return level;
}
