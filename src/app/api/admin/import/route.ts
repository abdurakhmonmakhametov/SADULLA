import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { mutate, type Data } from "@/lib/server/db";

/**
 * TEMPORARY one-time import of the local JSON database into Postgres.
 * Requires the APP_SECRET header. Merges without overwriting: accounts whose
 * email already exists keep their online record (their local interviews are
 * attached to it, and a saved AI key is copied only if none is set).
 * Remove after the migration.
 */
export async function POST(req: Request) {
  const secret = process.env.APP_SECRET ?? "";
  const given = req.headers.get("x-import-secret") ?? "";
  const ok = secret.length > 0 && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Cleanup of a smoke-test account: ?deleteEmail=…
  const deleteEmail = new URL(req.url).searchParams.get("deleteEmail")?.toLowerCase();
  if (deleteEmail) {
    const removed = await mutate((d) => {
      const u = d.users.find((x) => x.email.toLowerCase() === deleteEmail);
      if (!u) return { deleted: false };
      d.users = d.users.filter((x) => x.id !== u.id);
      d.sessions = d.sessions.filter((s) => s.userId !== u.id);
      const before = d.interviews.length;
      d.interviews = d.interviews.filter((i) => i.userId !== u.id);
      return { deleted: true, interviewsRemoved: before - d.interviews.length };
    });
    return NextResponse.json(removed);
  }

  const body = (await req.json()) as Partial<Data>;
  const result = await mutate((d) => {
    const idMap = new Map<string, string>();
    let added = 0;
    let merged = 0;
    for (const u of body.users ?? []) {
      const existing = d.users.find((x) => x.email.toLowerCase() === u.email.toLowerCase());
      if (existing) {
        idMap.set(u.id, existing.id);
        if (!existing.ai && u.ai) existing.ai = u.ai;
        merged++;
      } else {
        d.users.push(u);
        idMap.set(u.id, u.id);
        added++;
      }
    }
    const known = new Set(d.interviews.map((i) => i.id));
    let interviews = 0;
    for (const iv of body.interviews ?? []) {
      const owner = idMap.get(iv.userId);
      if (!owner || known.has(iv.id)) continue;
      d.interviews.push({ ...iv, userId: owner });
      interviews++;
    }
    return { usersAdded: added, usersMerged: merged, interviewsAdded: interviews, totalUsers: d.users.length, totalInterviews: d.interviews.length };
  });
  return NextResponse.json(result);
}
