/**
 * Drizzle schema entry point (referenced by drizzle.config.ts).
 *
 * Tables live in ./schema/*, split by owner (TEAM_HANDOFF.md §8):
 *   identity.ts  — Shoaeb (mirrors the tables already in the dev database)
 *   catalogue.ts — Teammate 1 (planned; not on origin/main yet)
 *   inventory.ts — Teammate 2 (planned; not on origin/main yet)
 */
export * from "./schema/identity";
