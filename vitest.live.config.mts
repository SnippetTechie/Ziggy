import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";

config({ path: ".env.local", quiet: true });

/**
 * Live tests: the real handlers and services run against the REAL tables of the
 * configured Neon database, inside transactions that are always rolled back.
 * Run with `npm run test:live`. Never commits, never runs migrations.
 */
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/live/**/*.test.ts"],
    env: { ZIGGY_LIVE_DB: "1" },
    setupFiles: ["tests/setup/dns.ts"],
    testTimeout: 60000,
    hookTimeout: 120000,
    fileParallelism: false,
  },
});
