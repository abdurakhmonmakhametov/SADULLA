"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/*
 * Server dictation: records the mic as PCM, cuts it into phrases at natural
 * pauses (simple energy VAD), and sends each phrase as a 16 kHz WAV to
 * /api/stt while you keep talking. Silence is never uploaded, every request
 * stays well under the API's 1-minute blocking limit, and text appears
 * phrase by phrase instead of only at the end.
 */

const WORKLET = `
class Rec extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(2048); this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) for (let i = 0; i < ch.length; i++) {
      this.buf[this.n++] = ch[i];
      if (this.n === this.buf.length) { this.port.postMessage(this.buf.slice(0)); this.n = 0; }
    }
    return true;
  }
}
registerProcessor("rec", Rec);`;

const TARGET_RATE = 16000;
const PAUSE_MS = 700; // silence that ends a phrase
const MAX_SEGMENT_MS = 25000; // hard cut for long monologues
const MIN_SPEECH_MS = 250; // ignore clicks and coughs
const PRE_ROLL_MS = 300; // audio kept before speech starts

function encodeWav(chunks: Float32Array[], rate: number): Blob {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const ratio = rate / TARGET_RATE;
  const outLen = Math.floor(total / ratio);
  const view = new DataView(new ArrayBuffer(44 + outLen * 2));
  const str = (o: number, s: string) => [...s].forEach((ch, i) => view.setUint8(o + i, ch.charCodeAt(0)));
  str(0, "RIFF");
  view.setUint32(4, 36 + outLen * 2, true);
  str(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, TARGET_RATE, true);
  view.setUint32(28, TARGET_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, "data");
  view.setUint32(40, outLen * 2, true);

  // Flatten, then downsample by averaging each output sample's window.
  const flat = new Float32Array(total);
  let off = 0;
  for (const c of chunks) {
    flat.set(c, off);
    off += c.length;
  }
  for (let i = 0; i < outLen; i++) {
    const a = Math.floor(i * ratio);
    const b = Math.min(total, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = a; j < b; j++) sum += flat[j];
    const s = Math.max(-1, Math.min(1, sum / Math.max(1, b - a)));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([view.buffer], { type: "audio/wav" });
}

export function serverSttSupported() {
  return typeof window !== "undefined" && "AudioWorkletNode" in window;
}

export function useServerStt(stream: MediaStream | null, onPhrase: (text: string, tag: string) => void) {
  const [listening, setListening] = useState(false);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onPhraseRef = useRef(onPhrase);
  useEffect(() => {
    onPhraseRef.current = onPhrase;
  }, [onPhrase]);

  const graph = useRef<{ ctx: AudioContext; node: AudioWorkletNode; src: MediaStreamAudioSourceNode } | null>(null);
  const graphPromise = useRef<Promise<void> | null>(null);
  const rec = useRef({ on: false, tag: "", chunks: [] as Float32Array[], speechMs: 0, silenceMs: 0, segMs: 0, floor: 0.01 });
  const chain = useRef<Promise<void>>(Promise.resolve());

  const send = useCallback((chunks: Float32Array[], rate: number, tag: string) => {
    const wav = encodeWav(chunks, rate);
    setPending((n) => n + 1);
    const request = fetch("/api/stt", { method: "POST", headers: { "Content-Type": "audio/wav" }, body: wav })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        return ((await r.json()) as { text: string }).text;
      })
      .catch(() => {
        setError("Bir bo‘lak nutqni matnga aylantirib bo‘lmadi. Internetni tekshiring yoki javobni yozib to‘ldiring.");
        return "";
      });
    // Deliver in recording order even if requests finish out of order.
    chain.current = chain.current.then(async () => {
      const text = await request;
      if (text) onPhraseRef.current(text, tag);
      setPending((n) => n - 1);
    });
  }, []);

  const cut = useCallback(() => {
    const r = rec.current;
    const g = graph.current;
    if (g && r.speechMs >= MIN_SPEECH_MS) send(r.chunks, g.ctx.sampleRate, r.tag);
    r.chunks = [];
    r.speechMs = r.silenceMs = r.segMs = 0;
  }, [send]);

  const onChunk = useCallback(
    (chunk: Float32Array, rate: number) => {
      const r = rec.current;
      if (!r.on) return;
      const ms = (chunk.length / rate) * 1000;
      let sum = 0;
      for (let i = 0; i < chunk.length; i++) sum += chunk[i] * chunk[i];
      const rms = Math.sqrt(sum / chunk.length);
      // Adaptive noise floor: drops instantly, rises slowly.
      r.floor = rms < r.floor ? rms : r.floor + (rms - r.floor) * 0.002;
      const speech = rms > Math.max(0.015, r.floor * 3);

      r.chunks.push(chunk);
      r.segMs += ms;
      if (speech) {
        r.speechMs += ms;
        r.silenceMs = 0;
      } else if (r.speechMs > 0) {
        r.silenceMs += ms;
      } else {
        // Nothing said yet: keep only a short pre-roll.
        while (r.segMs > PRE_ROLL_MS && r.chunks.length > 1) r.segMs -= (r.chunks.shift()!.length / rate) * 1000;
      }
      if ((r.speechMs > 0 && r.silenceMs >= PAUSE_MS) || r.segMs >= MAX_SEGMENT_MS) cut();
    },
    [cut],
  );

  const ensureGraph = useCallback(async () => {
    if (graph.current || !stream) return;
    graphPromise.current ??= (async () => {
      const ctx = new AudioContext();
      const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
      await ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      const src = ctx.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));
      const node = new AudioWorkletNode(ctx, "rec");
      const mute = ctx.createGain();
      mute.gain.value = 0;
      src.connect(node).connect(mute).connect(ctx.destination);
      node.port.onmessage = (e: MessageEvent<Float32Array>) => onChunk(e.data, ctx.sampleRate);
      graph.current = { ctx, node, src };
    })();
    await graphPromise.current;
  }, [stream, onChunk]);

  const start = useCallback(
    async (tag: string) => {
      setError(null);
      try {
        await ensureGraph();
        if (!graph.current) throw new Error("no audio");
        await graph.current.ctx.resume();
        Object.assign(rec.current, { on: true, tag, chunks: [], speechMs: 0, silenceMs: 0, segMs: 0 });
        setListening(true);
      } catch {
        graphPromise.current = null;
        setError("Mikrofonni yoqib bo‘lmadi. Qayta urinib ko‘ring yoki javobni yozing.");
      }
    },
    [ensureGraph],
  );

  const stop = useCallback(() => {
    if (rec.current.on) cut();
    rec.current.on = false;
    setListening(false);
  }, [cut]);

  /** Stops and resolves once every recorded phrase has been transcribed. */
  const flush = useCallback(() => {
    stop();
    return chain.current;
  }, [stop]);

  useEffect(
    () => () => {
      rec.current.on = false;
      const g = graph.current;
      graph.current = null;
      graphPromise.current = null;
      if (g) {
        g.src.disconnect();
        g.node.port.onmessage = null;
        void g.ctx.close();
      }
    },
    [stream],
  );

  return { listening, pending, error, start, stop, flush };
}
