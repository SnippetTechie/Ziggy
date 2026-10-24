import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { and, asc, eq, sql } from "drizzle-orm";
import { db, pool } from "../../src/server/db";
import { locations, members, workspaces } from "../../src/server/db/schema";
import type { Access } from "../../src/modules/access/policy";
import { listMovements, listProducts, lowStockAlerts, summary } from "../../src/server/services/queries";
import { live } from "../helpers/live";

/**
 * READ-ONLY checks of the real development workspace: the same service
 * functions the dashboard, alerts and reports use are run for the real ACTIVE
 * Admin and cross-checked against independent SQL. Nothing is inserted,
 * updated, or deleted, and nothing is printed that identifies a person.
 */
describe.skipIf(!live)("real development workspace (read-only)", () => {
  let access: Access;
  let defaultThreshold: string;
  beforeAll(async () => {
    const [row] = await db
      .select({ workspaceId: members.workspaceId, userId: members.userId, role: members.role, locationId: locations.id, settings: workspaces.settings })
      .from(members)
      .innerJoin(locations, eq(locations.workspaceId, members.workspaceId))
      .innerJoin(workspaces, eq(workspaces.id, members.workspaceId))
      .where(and(eq(members.role, "ADMIN"), eq(members.status, "ACTIVE")))
      .orderBy(asc(members.workspaceId), asc(locations.id))
      .limit(1);
    expect(row, "the dev database should have an ACTIVE Admin with a location").toBeDefined();
    access = { workspaceId: row.workspaceId, userId: row.userId, role: row.role, locationId: row.locationId };
    defaultThreshold = row.settings.defaultLowStockThreshold ?? "10";
  });
  afterAll(async () => {
    await pool.end();
  });

  const scalar = async (query: ReturnType<typeof sql>) => Number(((await db.execute(query)).rows[0] as { n: string | number }).n);
  // Built per call: `access` is only known after beforeAll has run.
  const qty = () => sql`coalesce(b.quantity_on_hand, 0)`;
  const thr = () => sql`coalesce(p.low_stock_threshold, ${defaultThreshold}::numeric)`;
  const activeProducts = () => sql`from products p left join inventory_balances b on b.product_id = p.id and b.workspace_id = p.workspace_id and b.location_id = ${access.locationId}::uuid where p.workspace_id = ${access.workspaceId}::uuid and p.is_active`;

  it("dashboard counts equal independent SQL counts", async () => {
    const s = await summary(access);
    const sqlActive = await scalar(sql`select count(*) n ${activeProducts()}`);
    const sqlOut = await scalar(sql`select count(*) n ${activeProducts()} and ${qty()} = 0`);
    const sqlLow = await scalar(sql`select count(*) n ${activeProducts()} and ${qty()} <= ${thr()}`);
    expect(s.products).toBe(sqlActive);
    expect(s.out).toBe(sqlOut);
    expect(s.low).toBe(sqlLow);
    expect(s.out).toBeLessThanOrEqual(s.low); // out of stock is always also at/below threshold
  });

  it("alerts are exactly the products at or below threshold, most urgent first, with the full total", async () => {
    const s = await summary(access);
    const a = await lowStockAlerts(access, { limit: "200" });
    expect(a.total).toBe(s.low);
    expect(a.items.length).toBe(Math.min(s.low, 200));
    expect(a.items.every(p => p.stockStatus === "Out of stock" || p.stockStatus === "Low stock")).toBe(true);
    const statuses = a.items.map(p => p.stockStatus);
    const firstLow = statuses.indexOf("Low stock");
    if (firstLow >= 0) expect(statuses.slice(firstLow).every(x => x === "Low stock")).toBe(true); // all Out of stock precede Low stock
    const lowQty = a.items.filter(p => p.stockStatus === "Low stock").map(p => Number(p.quantity));
    expect(lowQty).toEqual([...lowQty].sort((x, y) => x - y)); // numeric, not lexicographic
    expect(new Set(a.items.map(p => p.id)).size).toBe(a.items.length);
    // The alert list agrees with the product list's own low-stock filter.
    const viaProducts = await listProducts(access, { stock: "low", limit: "200" });
    expect(new Set(viaProducts.items.map(p => p.id))).toEqual(new Set(a.items.map(p => p.id)));
  });

  it("movement history paginates without gaps or duplicates and matches the SQL count", async () => {
    const expected = await scalar(sql`select count(*) n from stock_movements where workspace_id = ${access.workspaceId}::uuid`);
    const seen = new Set<string>();
    let cursor: string | null = null;
    do {
      const page = await listMovements(access, { limit: "200", ...(cursor ? { cursor } : {}) });
      for (const m of page.items) {
        expect(seen.has(m.id)).toBe(false);
        seen.add(m.id);
      }
      cursor = page.nextCursor;
    } while (cursor);
    expect(seen.size).toBe(expected);
  });

  it("a date range returns exactly the SQL count for those whole workspace-local days", async () => {
    const days = (await db.execute(sql`select to_char(min(occurred_at at time zone 'Asia/Kolkata'), 'YYYY-MM-DD') as d from stock_movements where workspace_id = ${access.workspaceId}::uuid`)).rows[0] as { d: string | null };
    if (!days.d) return; // empty history: nothing to range over
    const expected = await scalar(sql`select count(*) n from stock_movements where workspace_id = ${access.workspaceId}::uuid and occurred_at >= (${days.d}::date)::timestamp at time zone 'Asia/Kolkata' and occurred_at < ((${days.d}::date + 1)::timestamp at time zone 'Asia/Kolkata')`);
    let total = 0;
    let cursor: string | null = null;
    do {
      const page = await listMovements(access, { from: days.d, to: days.d, limit: "200", ...(cursor ? { cursor } : {}) });
      total += page.items.length;
      cursor = page.nextCursor;
    } while (cursor);
    expect(total).toBe(expected);
    expect(expected).toBeGreaterThan(0);
  });

  it("stock changes reconcile: every balance equals total in minus total out, and none is negative", async () => {
    const bad = await db.execute(sql`
      select p.id
        from products p
        left join inventory_balances b on b.product_id = p.id and b.workspace_id = p.workspace_id and b.location_id = ${access.locationId}::uuid
        left join (
          select product_id,
                 sum(case when movement_type = 'STOCK_IN' then quantity else -quantity end) as net
            from stock_movements where workspace_id = ${access.workspaceId}::uuid group by product_id
        ) m on m.product_id = p.id
       where p.workspace_id = ${access.workspaceId}::uuid
         and coalesce(b.quantity_on_hand, 0) <> coalesce(m.net, 0)`);
    expect(bad.rows).toHaveLength(0);
    const negative = await scalar(sql`select count(*) n from inventory_balances where workspace_id = ${access.workspaceId}::uuid and quantity_on_hand < 0`);
    expect(negative).toBe(0);
  });

  it("is workspace-scoped: other workspaces' products never appear", async () => {
    const mine = await listProducts(access, { limit: "200", status: "all" });
    const ids = mine.items.map(p => p.id);
    if (!ids.length) return;
    const foreign = await scalar(sql`select count(*) n from products where id = any(${sql.raw(`array['${ids.join("','")}']::uuid[]`)}) and workspace_id <> ${access.workspaceId}::uuid`);
    expect(foreign).toBe(0);
  });
});
