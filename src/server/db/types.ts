import type { Db } from "./index";

/**
 * Anything services can run queries on: the app `db` or a transaction handle.
 * Services take an Executor so tests can run them inside a rolled-back
 * transaction instead of mutating shared data.
 */
export type Executor = Pick<Db, "select" | "insert" | "update" | "delete" | "execute" | "transaction">;
