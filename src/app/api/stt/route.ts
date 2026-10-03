import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { speechStatus, transcribe } from "@/lib/server/tts";

const MAX_BYTES = 4 * 1024 * 1024; // ~2 min of 16 kHz mono WAV; clips are cut far shorter.

/** Body: a WAV clip (audio/wav). Returns `{ text }`. */
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!speechStatus().stt.includes("uz")) return NextResponse.json({ error: "Nutqni aniqlash sozlanmagan." }, { status: 503 });

  const buf = await req.arrayBuffer();
  if (buf.byteLength < 44 || buf.byteLength > MAX_BYTES) return NextResponse.json({ error: "Audio hajmi noto‘g‘ri." }, { status: 400 });

  try {
    const text = await transcribe(new Blob([buf], { type: "audio/wav" }));
    return NextResponse.json({ text });
  } catch (err) {
    console.error("[stt]", err);
    return NextResponse.json({ error: "Nutqni matnga aylantirib bo‘lmadi." }, { status: 502 });
  }
}
