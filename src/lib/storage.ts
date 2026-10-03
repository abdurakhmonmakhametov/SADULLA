"use client";

import { useSyncExternalStore } from "react";
import type { Interview, InterviewConfig, Question, Source } from "./types";

/**
 * Client-side cache of the signed-in user's interviews, synced to /api/interviews.
 * Reads are synchronous (useSyncExternalStore); writes apply immediately and are
 * saved to the server in the background (debounced per interview).
 */

type State = { status: "idle" | "loading" | "ready" | "error"; list: Interview[] };

let state: State = { status: "idle", list: [] };
const listeners = new Set<() => void>();
const pending = new Map<string, ReturnType<typeof setTimeout>>();
const dirty = new Set<string>();
/** In-flight POSTs, so an early PUT never races ahead of the create. */
const creating = new Map<string, Promise<unknown>>();

function emit(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

async function load() {
  emit({ ...state, status: "loading" });
  try {
    const res = await fetch("/api/interviews", { cache: "no-store" });
    if (res.status === 401) {
      // Session expired: this module lives outside React, so no router is available here.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
      return;
    }
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { interviews: Interview[] };
    emit({ status: "ready", list: data.interviews });
  } catch (err) {
    console.error("Suhbatlarni yuklab bo‘lmadi", err);
    emit({ ...state, status: "error" });
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (state.status === "idle") void load();
  return () => listeners.delete(cb);
}

const getSnapshot = () => state;
const SERVER_STATE: State = { status: "idle", list: [] };

export function useInterviewStore(): State {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_STATE);
}

/** All interviews, newest first. `null` until loaded. */
export function useInterviews(): Interview[] | null {
  const s = useInterviewStore();
  return s.status === "ready" ? s.list : null;
}

/** One interview by id: `undefined` while loading, `null` if it doesn't exist. */
export function useInterview(id: string): Interview | null | undefined {
  const list = useInterviews();
  if (list === null) return undefined;
  return list.find((i) => i.id === id) ?? null;
}

export function retryLoad() {
  void load();
}

/** Drop cached data (after logout / account switch). */
export function resetInterviewStore() {
  pending.forEach((t) => clearTimeout(t));
  pending.clear();
  dirty.clear();
  state = { status: "idle", list: [] };
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
}

function save(id: string, keepalive = false) {
  const interview = state.list.find((i) => i.id === id);
  dirty.delete(id);
  if (!interview) return;
  const body = JSON.stringify(interview);
  void (creating.get(id) ?? Promise.resolve())
    .then(() => fetch(`/api/interviews/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body, keepalive }))
    .catch((err) => console.error("Saqlab bo‘lmadi", err));
}

function scheduleSave(id: string) {
  dirty.add(id);
  clearTimeout(pending.get(id));
  pending.set(
    id,
    setTimeout(() => {
      pending.delete(id);
      save(id);
    }, 600),
  );
}

/** Push any unsaved edits right away (e.g. before leaving the page). */
export function flushSaves(keepalive = false) {
  for (const id of [...dirty]) {
    clearTimeout(pending.get(id));
    pending.delete(id);
    save(id, keepalive);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => flushSaves(true));
}

export function createInterview(config: InterviewConfig, questions: Pick<Question, "text" | "hint">[], source: Source): Interview {
  const now = Date.now();
  const interview: Interview = {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    config,
    questions: questions.map((q) => ({ id: newId(), text: q.text, hint: q.hint, kind: "main" })),
    answers: {},
    currentIndex: 0,
    status: "ready",
    questionSource: source,
  };
  emit({ status: "ready", list: [interview, ...state.list] });
  const req = fetch("/api/interviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(interview),
  })
    .catch((err) => console.error("Saqlab bo‘lmadi", err))
    .finally(() => creating.delete(interview.id));
  creating.set(interview.id, req);
  return interview;
}

export function updateInterview(id: string, patch: (i: Interview) => Interview) {
  emit({ ...state, list: state.list.map((i) => (i.id === id ? { ...patch(i), updatedAt: Date.now() } : i)) });
  scheduleSave(id);
}

export function deleteInterview(id: string) {
  clearTimeout(pending.get(id));
  pending.delete(id);
  dirty.delete(id);
  emit({ ...state, list: state.list.filter((i) => i.id !== id) });
  void fetch(`/api/interviews/${id}`, { method: "DELETE" });
}

/** Same config and main questions, fresh answers. Follow-ups are regenerated live. */
export function restartInterview(source: Interview): Interview {
  return createInterview(source.config, source.questions.filter((q) => q.kind === "main"), source.questionSource);
}
