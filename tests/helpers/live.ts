import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "../../src/server/db/schema";

neonConfig.webSocketConstructor = globalThis.WebSocket;

/** Live tests only run through `npm run test:live` (which sets ZIGGY_LIVE_DB=1) and need DATABASE_URL. */
export const live = process.env.ZIGGY_LIVE_DB === "1" && Boolean(process.env.DATABASE_URL);

export type Tx = Parameters<Parameters<ReturnType<typeof makeDb>["transaction"]>[0]>[0];
function makeDb(pool: Pool) {
  return drizzle({ client: pool, schema });
}

class Rollback extends Error {}

/**
 * One long-lived transaction shared by a whole test file. Nothing is ever
 * committed: `finish()` always rolls back, so the shared development database
 * keeps exactly the business records it had before the run.
 */
export function sharedRollback<F>(build: (tx: Tx) => Promise<F>) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let release: () => void = () => {};
  let ready: (v: { tx: Tx; fixture: F }) => void = () => {};
  let failed: (e: unknown) => void = () => {};
  const readyPromise = new Promise<{ tx: Tx; fixture: F }>((res, rej) => {
    ready = res;
    failed = rej;
  });
  const hold = new Promise<void>(res => {
    release = res;
  });
  let running: Promise<unknown> = Promise.resolve();

  return {
    start() {
      running = makeDb(pool)
        .transaction(async tx => {
          try {
            ready({ tx, fixture: await build(tx) });
          } catch (error) {
            failed(error);
            return;
          }
          await hold;
          throw new Rollback();
        })
        .catch(error => {
          if (!(error instanceof Rollback)) failed(error);
        });
      return readyPromise;
    },
    async finish() {
      release();
      await running;
      await pool.end();
    },
  };
}
