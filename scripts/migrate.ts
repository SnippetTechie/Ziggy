import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
config({ path: ".env.local", quiet: true });
neonConfig.webSocketConstructor = globalThis.WebSocket;
async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED;
  if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED is required.");
  const pool = new Pool({ connectionString });
  try {
    if (process.argv.includes("--check")) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const name = "ziggy_check_" + crypto.randomUUID().replaceAll("-", "");
        if (!/^ziggy_check_[a-f0-9]{32}$/.test(name)) throw new Error("Invalid check schema");
        await client.query(`CREATE SCHEMA "${name}"`);
        await client.query(`SET LOCAL search_path TO "${name}"`);
        const journal = JSON.parse(readFileSync("drizzle/migrations/meta/_journal.json", "utf8"));
        for (const entry of journal.entries) {
          const migration = readFileSync(`drizzle/migrations/${entry.tag}.sql`, "utf8").replaceAll('"public".', `"${name}".`);
          for (const statement of migration.split("--> statement-breakpoint")) if (statement.trim()) await client.query(statement);
        }
        console.log("Migration dry run succeeded. Rolling back all schema changes.");
      } finally { await client.query("ROLLBACK"); client.release(); }
    } else {
      const metadata = await pool.query("select to_regclass('drizzle.__drizzle_migrations') as table_name");
      if (metadata.rows[0].table_name) {
        const journal = JSON.parse(readFileSync("drizzle/migrations/meta/_journal.json", "utf8"));
        const hashes = new Set(journal.entries.map((entry: { tag: string }) => createHash("sha256").update(readFileSync(`drizzle/migrations/${entry.tag}.sql`, "utf8")).digest("hex")));
        const applied = await pool.query("select hash from drizzle.__drizzle_migrations");
        if (applied.rows.some((row: { hash: string }) => !hashes.has(row.hash))) throw new Error("Database migration history differs from this checkout. Pull the matching team migrations before applying changes.");
      }
      await migrate(drizzle(pool), { migrationsFolder: "drizzle/migrations" });
      console.log("Drizzle migrations applied successfully.");
    }
  } finally { await pool.end(); }
}
main().catch((error: unknown) => {
  const failure = error as { message?: string; code?: string };
  console.error("Migration failed:", failure.code ?? "", failure.message?.replace(/postgres(?:ql)?:\/\/[^\s]+/g, "[connection URL hidden]"));
  process.exitCode = 1;
});
