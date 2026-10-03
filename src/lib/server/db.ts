import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Interview } from "../types";
import type { ProviderId } from "../ai/providers";

/**
 * Tiny JSON-file database. Good for a single Node process (local / one VM);
 * swap for Postgres or similar before running multiple instances.
 */

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: number;
  /** The user's own AI provider. The API key is AES-GCM encrypted. */
  ai?: { provider: ProviderId; model: string; baseUrl?: string; keyEnc?: string; keyLast4?: string; updatedAt: number };
}

export interface SessionRecord {
  tokenHash: string;
  userId: string;
  expiresAt: number;
}

export interface StoredInterview extends Interview {
  userId: string;
}

interface Data {
  users: UserRecord[];
  sessions: SessionRecord[];
  interviews: StoredInterview[];
}

const FILE = process.env.DATA_FILE || path.join(process.cwd(), "data", "db.json");

/*
 * Next bundles route handlers and pages separately, so this module can be
 * instantiated more than once per process. Keep the state on globalThis so every
 * copy shares one cache and one write queue.
 */
type Store = { cache: Data | null; writing: Promise<void>; queue: Promise<unknown> };
const g = globalThis as typeof globalThis & { __suhbatdoshDb?: Store };
const store: Store = (g.__suhbatdoshDb ??= { cache: null, writing: Promise.resolve(), queue: Promise.resolve() });

async function load(): Promise<Data> {
  if (store.cache) return store.cache;
  let cache: Data;
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<Data>;
    cache = { users: parsed.users ?? [], sessions: parsed.sessions ?? [], interviews: parsed.interviews ?? [] };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    cache = { users: [], sessions: [], interviews: [] };
  }
  // Another copy may have finished loading while we awaited the file.
  store.cache ??= cache;
  return store.cache;
}

async function persist(data: Data) {
  const now = Date.now();
  data.sessions = data.sessions.filter((s) => s.expiresAt > now);
  const json = JSON.stringify(data);
  // Serialise writes and replace atomically so a crash never leaves half a file.
  store.writing = store.writing.catch(() => undefined).then(async () => {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    const tmp = `${FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, json, "utf8");
    await fs.rename(tmp, FILE);
  });
  await store.writing;
}

/** Read-only access. */
export async function read<T>(fn: (d: Data) => T): Promise<T> {
  return fn(await load());
}

/** Mutate and persist. Mutations run one at a time. */
export function mutate<T>(fn: (d: Data) => T): Promise<T> {
  const run = store.queue.then(async () => {
    const data = await load();
    const result = fn(data);
    await persist(data);
    return result;
  });
  store.queue = run.catch(() => undefined);
  return run;
}
