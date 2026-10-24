import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

/**
 * Database client for application traffic.
 *
 * Uses the pooled Neon connection (DATABASE_URL) over WebSockets, which
 * supports interactive transactions — required for stock posting, where
 * balances must be locked and updated atomically (doc 05 §10).
 */
// Native WebSocket is available in Node 22+ (the project uses Node 24).
neonConfig.webSocketConstructor = globalThis.WebSocket;
export const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 8, ...(process.env.TEST_SCHEMA ? { options: `-c search_path=${process.env.TEST_SCHEMA}` } : {}) });
export const db = drizzle({ client: pool, schema });
export type Db = typeof db;
export type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];
