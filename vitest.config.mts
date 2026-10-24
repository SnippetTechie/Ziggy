import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
config({ path: ".env.local", quiet: true });
export default defineConfig({ resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } }, test: { include: ["tests/**/*.test.ts"], setupFiles: ["tests/setup/dns.ts"], testTimeout: 30000, hookTimeout: 30000 } });
