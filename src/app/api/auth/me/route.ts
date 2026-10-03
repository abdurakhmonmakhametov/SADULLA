import { NextResponse } from "next/server";
import { requireUser, toPublic } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  return NextResponse.json({ user: toPublic(auth.user) });
}
