import "server-only";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

/**
 * Database client for application traffic.
 *
 * Uses the pooled Neon connection (DATABASE_URL) over WebSockets, which
 * supports interactive transactions — required for stock posting, where
 * balances must be locked and updated atomically (doc 05 §10).
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Run `npx neon@latest env pull` or see .env.example.");
}

const pool = new Pool({ connectionString });

export const db = drizzle({ client: pool, schema });
export type Db = typeof db;
