import { NextResponse } from "next/server";
import { z } from "zod";
import { readBody } from "@/lib/api";
import { requireUser } from "@/lib/server/auth";
import { speechStatus, synthesize } from "@/lib/server/tts";

const ttsRequest = z.object({
  text: z.string().trim().min(1).max(1500),
  lang: z.enum(["uz", "en"]),
  gender: z.enum(["female", "male"]).default("female"),
});

/** Returns `{ url }` (playable link) or the audio itself as audio/mpeg. */
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const body = await readBody(req, ttsRequest);
  if (!body.ok) return body.response;
  if (!speechStatus().tts.includes(body.data.lang)) return NextResponse.json({ error: "Server ovozi sozlanmagan." }, { status: 503 });

  try {
    const result = await synthesize(body.data.text, body.data.lang, body.data.gender);
    if ("url" in result) return NextResponse.json({ url: result.url });
    return new NextResponse(new Uint8Array(result.audio), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400" },
    });
  } catch (err) {
    console.error("[tts]", err);
    return NextResponse.json({ error: "Ovoz yaratib bo‘lmadi." }, { status: 502 });
  }
}
