import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";

/**
 * Parses a JSON body against a schema. On failure returns a 400 whose `error`
 * is the first issue's (Uzbek) message and `field` its top-level key.
 */
export async function readBody<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: NextResponse }> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return { ok: false, response: NextResponse.json({ error: "So‘rov noto‘g‘ri yuborildi." }, { status: 400 }) };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      response: NextResponse.json(
        { error: first?.message ?? "Ma’lumotlar noto‘g‘ri.", field: first?.path[0] },
        { status: 400 },
      ),
    };
  }
  return { ok: true, data: parsed.data };
}
