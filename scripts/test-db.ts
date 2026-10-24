import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { Pool, neonConfig } from "@neondatabase/serverless";
config({ path: ".env.local", quiet: true });
neonConfig.webSocketConstructor = globalThis.WebSocket;
async function main() {
  const name = "ziggy_test_" + crypto.randomUUID().replaceAll("-", "");
  if (!/^ziggy_test_[a-f0-9]{32}$/.test(name)) throw new Error("Invalid disposable schema name");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED });
  const client = await pool.connect();
  try {
    await client.query(`CREATE SCHEMA "${name}"`);
    await client.query(`SET search_path TO "${name}"`);
    const journal = JSON.parse(readFileSync("drizzle/migrations/meta/_journal.json", "utf8"));
    for (const entry of journal.entries) {
      const migration = readFileSync(`drizzle/migrations/${entry.tag}.sql`, "utf8").replaceAll('"public".', `"${name}".`);
      for (const statement of migration.split("--> statement-breakpoint")) if (statement.trim()) await client.query(statement);
    }
    console.log("Local migrations applied to a disposable test schema; application tables untouched.");
    const exit = await new Promise<number>(resolve => {
      const child = spawn(process.execPath, ["node_modules/vitest/vitest.mjs", "run"], { stdio: "inherit", env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL_UNPOOLED, RUN_DB_TESTS: "1", TEST_SCHEMA: name } });
      child.on("exit", code => resolve(code ?? 1));
      child.on("error", () => resolve(1));
    });
    process.exitCode = exit;
  } finally {
    await client.query("SET search_path TO public");
    await client.query(`DROP SCHEMA IF EXISTS "${name}" CASCADE`);
    client.release(); await pool.end();
    console.log("Disposable test schema removed.");
  }
}
main().catch(error => { console.error("Database tests failed:", error.code ?? error.message); process.exitCode = 1; });
