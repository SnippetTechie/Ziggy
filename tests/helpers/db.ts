import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "@/server/db/schema";
import type { Executor } from "@/server/db/types";

export const hasDatabase = Boolean(process.env.DATABASE_URL);

/** Sentinel thrown at the end of every test transaction so Postgres rolls it back. */
class Rollback extends Error {}

let pool: Pool | null = null;
export function testPool(): Pool {
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}
export async function closeTestPool(): Promise<void> {
  await pool?.end();
  pool = null;
}

/** Plain (non-transactional) client — for READ-ONLY checks against real data. */
export function readOnlyDb() {
  return drizzle({ client: testPool(), schema });
}

/**
 * Run `fn` inside a transaction that is ALWAYS rolled back, so tests can insert
 * fixtures and create session-local temp tables without ever changing the
 * shared development database.
 */
export async function withRollback<T>(fn: (ex: Executor) => Promise<T>): Promise<T> {
  const db = drizzle({ client: testPool(), schema });
  let result: T | undefined;
  try {
    await db.transaction(async (tx) => {
      result = await fn(tx as unknown as Executor);
      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }
  return result as T;
}

/**
 * One long-lived rolled-back transaction shared by every test in a file, so an
 * expensive fixture is inserted once instead of per test. Call `start()` in
 * beforeAll and `finish()` in afterAll; nothing is ever committed.
 */
export function sharedRollback<F>(build: (ex: Executor) => Promise<F>) {
  let release: () => void = () => {};
  let ready: (v: { ex: Executor; fixture: F }) => void = () => {};
  let failed: (e: unknown) => void = () => {};
  const readyPromise = new Promise<{ ex: Executor; fixture: F }>((res, rej) => {
    ready = res;
    failed = rej;
  });
  const hold = new Promise<void>((res) => {
    release = res;
  });
  let running: Promise<unknown> | null = null;

  return {
    async start() {
      running = withRollback(async (ex) => {
        try {
          ready({ ex, fixture: await build(ex) });
        } catch (error) {
          failed(error);
          return;
        }
        await hold;
      }).catch(failed);
      return readyPromise;
    },
    async finish() {
      release();
      await running;
    },
  };
}
