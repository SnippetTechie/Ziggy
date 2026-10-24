import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { db, pool } from "../../src/server/db";
import { users, workspaces, locations, members, products, balances, movements } from "../../src/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { postStock, postStockInTransaction } from "../../src/modules/inventory/service";
import { setMember } from "../../src/server/services/administration";
import { checkActor } from "../../src/server/services/shared";
import type { Access } from "../../src/modules/access/policy";

const live = process.env.RUN_DB_TESTS === "1" && !!process.env.TEST_SCHEMA;
describe.skipIf(!live)("real database stock transactions (isolated test workspace)", () => {
  const workspaceId = crypto.randomUUID(), userId = crypto.randomUUID(), locationId = crypto.randomUUID(), productId = crypto.randomUUID();
  const access: Access = { workspaceId, userId, locationId, role: "ADMIN" };
  beforeAll(async () => {
    await db.insert(users).values({ id: userId, clerkUserId: `test_${userId}`, email: `integration-${userId}@example.invalid`, displayName: "Integration test" });
    await db.insert(workspaces).values({ id: workspaceId, name: "Integration fixture", slug: `test-${workspaceId}` });
    await db.insert(locations).values({ id: locationId, workspaceId, name: "Fixture", code: "TEST" });
    await db.insert(members).values({ userId, workspaceId, role: "ADMIN" });
    await db.insert(products).values({ id: productId, workspaceId, sku: "TEST", name: "Fixture" });
    await db.insert(balances).values({ workspaceId, locationId, productId });
  });
  afterAll(async () => {
    // The runner drops only its disposable schema. Never delete immutable history.
    await pool.end();
  });
  const input = { productId, quantity: "10", reasonCode: "PURCHASE" as const, supplierId: null, unitCost: null, reference: "", note: "" };
  it("deduplicates simultaneous retries and rejects payload/key reuse", async () => {
    const key = crypto.randomUUID();
    const [a, b] = await Promise.all([postStock(access, input, "STOCK_IN", key), postStock(access, input, "STOCK_IN", key)]);
    expect(a.id).toBe(b.id);
    await expect(postStock(access, { ...input, quantity: "11" }, "STOCK_IN", key)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    const [balance] = await db.select().from(balances).where(eq(balances.productId, productId));
    expect(balance.quantityOnHand).toBe("10.000000");
  });
  it("serializes concurrent issues so only one can take the remaining stock", async () => {
    const results = await Promise.allSettled([postStock(access, { ...input, quantity: "7", reasonCode: "ISSUE" }, "STOCK_OUT", crypto.randomUUID()), postStock(access, { ...input, quantity: "7", reasonCode: "ISSUE" }, "STOCK_OUT", crypto.randomUUID())]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
    const [balance] = await db.select().from(balances).where(eq(balances.productId, productId));
    expect(balance.quantityOnHand).toBe("3.000000");
    const [count] = await db.select({ count: sql<number>`count(*)::int` }).from(movements).where(eq(movements.workspaceId, workspaceId));
    expect(count.count).toBe(2);
  });
  it("rejects cross-workspace references and suspended actors without writes", async () => {
    await expect(postStock({ ...access, workspaceId: crypto.randomUUID() }, input, "STOCK_IN", crypto.randomUUID())).rejects.toBeDefined();
    await expect(postStock(access, { ...input, supplierId: crypto.randomUUID() }, "STOCK_IN", crypto.randomUUID())).rejects.toMatchObject({ code: "SUPPLIER_NOT_FOUND" });
    await db.update(members).set({ status: "SUSPENDED" }).where(eq(members.userId, userId));
    await expect(postStock(access, input, "STOCK_IN", crypto.randomUUID())).rejects.toMatchObject({ code: "FORBIDDEN" });
    const [balance] = await db.select().from(balances).where(eq(balances.productId, productId));
    expect(balance.quantityOnHand).toBe("3.000000");
  });
  it("enforces immutable history in the database", async () => {
    await expect(db.update(movements).set({ note: "overwrite" }).where(eq(movements.workspaceId, workspaceId))).rejects.toBeDefined();
    await expect(db.delete(movements).where(eq(movements.workspaceId, workspaceId))).rejects.toBeDefined();
  });
  it("can finish a stock write while an Admin changes that actor's membership", async () => {
    await db.update(members).set({ status: "ACTIVE" }).where(eq(members.userId, userId));
    const secondAdminId = crypto.randomUUID();
    await db.insert(users).values({ id: secondAdminId, clerkUserId: `test_${secondAdminId}`, email: `test-${secondAdminId}@example.invalid`, displayName: "Second fixture Admin" });
    await db.insert(members).values({ workspaceId, userId: secondAdminId, role: "ADMIN" });
    const other = { ...access, userId: secondAdminId };
    let changing: Promise<{ ok: boolean }> | undefined;
    await db.transaction(async tx => {
      await checkActor(tx, access, "STAFF");
      const pid = await tx.execute(sql`select pg_backend_pid() as pid`);
      const backendPid = Number(pid.rows[0].pid);
      changing = setMember(other, { userId, role: "STAFF", status: "ACTIVE" }).then(() => ({ ok: true }), () => ({ ok: false }));
      let blocked = false;
      for (let attempt = 0; attempt < 50; attempt++) {
        const waiting = await db.execute(sql`select 1 from pg_stat_activity where ${backendPid} = any(pg_blocking_pids(pid))`);
        if (waiting.rows.length) { blocked = true; break; }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      expect(blocked).toBe(true);
      await postStockInTransaction(tx, access, { ...input, quantity: "1" }, "STOCK_IN", crypto.randomUUID());
    });
    expect(await changing).toEqual({ ok: true });
  });
});
