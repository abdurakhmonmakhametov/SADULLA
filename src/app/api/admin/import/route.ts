import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { mutate, type Data } from "@/lib/server/db";

/**
 * TEMPORARY one-time import of the local JSON database into Postgres.
 * Requires the APP_SECRET header and only runs while the database has no users.
 * Remove after the migration.
 */
export async function POST(req: Request) {
  const secret = process.env.APP_SECRET ?? "";
  const given = req.headers.get("x-import-secret") ?? "";
  const ok = secret.length > 0 && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json()) as Partial<Data>;
  const result = await mutate((d) => {
    if (d.users.length > 0) return { imported: false, reason: "database already has users", users: d.users.length };
    d.users = body.users ?? [];
    d.interviews = body.interviews ?? [];
    d.sessions = []; // everyone signs in again
    return { imported: true, users: d.users.length, interviews: d.interviews.length };
  });
  return NextResponse.json(result);
}
