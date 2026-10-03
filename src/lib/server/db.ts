import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import type { Interview } from "../types";
import type { ProviderId } from "../ai/providers";

/**
 * Tiny document database with two backends:
 * - Postgres (DATABASE_URL / POSTGRES_URL set, e.g. Neon on Vercel): the whole
 *   document lives in one JSONB row; every mutation runs in a transaction that
 *   locks that row, so writes from all serverless instances are serialised.
 *   Nothing is cached between requests.
 * - JSON file (local dev): ./data/db.json, cached in memory, single process.
 * Fine for a small app; move to real tables before it grows large.
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

export interface Data {
  users: UserRecord[];
  sessions: SessionRecord[];
  interviews: StoredInterview[];
}

const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const FILE = process.env.DATA_FILE || path.join(process.cwd(), "data", "db.json");

const normalize = (p: Partial<Data> | null | undefined): Data => ({ users: p?.users ?? [], sessions: p?.sessions ?? [], interviews: p?.interviews ?? [] });
const pruneSessions = (d: Data) => {
  const now = Date.now();
  d.sessions = d.sessions.filter((s) => s.expiresAt > now);
};

/*
 * Next bundles route handlers and pages separately, so this module can be
 * instantiated more than once per process. Keep the state on globalThis so every
 * copy shares one connection pool (Postgres) or one cache and write queue (file).
 */
type Store = { cache: Data | null; writing: Promise<void>; queue: Promise<unknown>; sql: postgres.Sql | null; ready: Promise<void> | null };
const g = globalThis as typeof globalThis & { __suhbatdoshDb?: Store };
const store: Store = (g.__suhbatdoshDb ??= { cache: null, writing: Promise.resolve(), queue: Promise.resolve(), sql: null, ready: null });

/* ---------------- Postgres ---------------- */

async function pg(): Promise<postgres.Sql> {
  store.sql ??= postgres(DB_URL!, { max: 3, prepare: false, idle_timeout: 20, connect_timeout: 15, onnotice: () => {} });
  const sql = store.sql;
  store.ready ??= (async () => {
    await sql`create table if not exists app_state (id int primary key, data jsonb not null)`;
    await sql`insert into app_state (id, data) values (1, ${sql.json(normalize(null) as never)}) on conflict (id) do nothing`;
  })().catch((err) => {
    store.ready = null;
    throw err;
  });
  await store.ready;
  return sql;
}

async function pgRead(): Promise<Data> {
  const sql = await pg();
  const [row] = await sql<{ data: Data }[]>`select data from app_state where id = 1`;
  return normalize(row?.data);
}

async function pgMutate<T>(fn: (d: Data) => T): Promise<T> {
  const sql = await pg();
  return (await sql.begin(async (tx) => {
    const [row] = await tx<{ data: Data }[]>`select data from app_state where id = 1 for update`;
    const data = normalize(row?.data);
    const result = fn(data);
    pruneSessions(data);
    await tx`update app_state set data = ${tx.json(data as never)} where id = 1`;
    return result;
  })) as T;
}

/* ---------------- JSON file ---------------- */

async function load(): Promise<Data> {
  if (store.cache) return store.cache;
  if (process.env.VERCEL) {
    // Serverless file systems are read-only and per-instance: the JSON file cannot work there.
    throw new Error("DATABASE_URL is not set. Connect a Postgres database (e.g. Neon) to the Vercel project.");
  }
  let cache: Data;
  try {
    cache = normalize(JSON.parse(await fs.readFile(FILE, "utf8")) as Partial<Data>);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    cache = normalize(null);
  }
  // Another copy may have finished loading while we awaited the file.
  store.cache ??= cache;
  return store.cache;
}

async function persist(data: Data) {
  pruneSessions(data);
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

/* ---------------- public API ---------------- */

/** Read-only access. */
export async function read<T>(fn: (d: Data) => T): Promise<T> {
  return fn(DB_URL ? await pgRead() : await load());
}

/** Mutate and persist. Mutations run one at a time. */
export function mutate<T>(fn: (d: Data) => T): Promise<T> {
  if (DB_URL) return pgMutate(fn);
  const run = store.queue.then(async () => {
    const data = await load();
    const result = fn(data);
    await persist(data);
    return result;
  });
  store.queue = run.catch(() => undefined);
  return run;
}
