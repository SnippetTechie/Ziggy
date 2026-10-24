import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  MAX_EXPORT_ROWS,
  getInventorySummary,
  getLowStockAlerts,
  getMovementReport,
  getStockReport,
  inventoryAvailability,
} from "@/modules/reports/inventory-reads";
import type { Executor } from "@/server/db/types";
import { closeTestPool, hasDatabase, readOnlyDb, sharedRollback, withRollback } from "../helpers/db";
import { DEFAULT_THRESHOLD, createInventoryFixture, type Fixture } from "../helpers/inventory-fixture";

/**
 * Reads against the REAL inventory tables in the dev database. One fixture is
 * inserted inside a single transaction that is always rolled back after the
 * file finishes, so no business record is ever created, changed, or left behind.
 */
describe.skipIf(!hasDatabase)("inventory reads (real tables, rolled-back fixtures)", () => {
  const shared = sharedRollback(createInventoryFixture);
  let ex: Executor;
  let f: Fixture;
  beforeAll(async () => {
    ({ ex, fixture: f } = await shared.start());
  }, 120_000);
  afterAll(async () => {
    await shared.finish();
    await closeTestPool();
  });

  const base = () => ({ workspaceId: f.ws, defaultThreshold: DEFAULT_THRESHOLD });

  it("the real tables exist and satisfy the contract", async () => {
    const availability = await inventoryAvailability(readOnlyDb());
    expect(availability, `missing tables: ${JSON.stringify(availability)}`).toEqual({ available: true });
  });

  it("reports unavailable (not an error, not fake data) when the tables cannot be found", async () => {
    await withRollback(async (tx) => {
      // With only pg_temp on the search path none of the public tables resolve.
      await tx.execute(sql`set local search_path to pg_temp`);
      const result = await inventoryAvailability(tx);
      expect(result.available).toBe(false);
      if (!result.available) expect(result.missing.length).toBeGreaterThan(0);
    });
  });

  it("on the real database the summary and alerts are self-consistent (read-only)", async () => {
    const db = readOnlyDb();
    const real = await db.execute(sql`select id from workspaces order by created_at limit 1`);
    const workspaceId = (real.rows[0] as { id: string }).id;
    const summary = await getInventorySummary(db, { workspaceId, defaultThreshold: DEFAULT_THRESHOLD });
    const alerts = await getLowStockAlerts(db, { workspaceId, defaultThreshold: DEFAULT_THRESHOLD });
    expect(summary.available && alerts.available).toBe(true);
    if (summary.available && alerts.available) {
      expect(summary.summary.activeProducts).toBeGreaterThanOrEqual(summary.summary.lowStock + summary.summary.outOfStock);
      expect(alerts.total).toBe(summary.summary.lowStock + summary.summary.outOfStock);
    }
  });

  describe("low-stock rule: quantity_on_hand <= threshold (product, else workspace default)", () => {
    it("classifies boundaries, missing balance rows, inactive products, and workspaces exactly", async () => {
      const res = await getLowStockAlerts(ex, base());
      if (!res.available) throw new Error("tables unavailable");

      const byName = Object.fromEntries(res.alerts.map((a) => [a.name, a.status]));
      // OUT of stock: zero balance, including a product with NO inventory_balances row.
      expect(byName["No balance row"]).toBe("OUT_OF_STOCK");
      expect(byName["Zero explicit"]).toBe("OUT_OF_STOCK");
      // LOW stock: at the threshold, workspace-default fallback boundary, exact decimals.
      expect(byName["Rice 5kg"]).toBe("LOW_STOCK"); // 5 <= 5
      expect(byName["Default boundary"]).toBe("LOW_STOCK"); // 10 <= default 10
      expect(byName["Decimal low"]).toBe("LOW_STOCK"); // 0.3 <= 0.3
      expect(byName["50% off _special"]).toBe("LOW_STOCK"); // 1 <= 100
      // NOT alerts: just above threshold, split balances summing above it, zero threshold, inactive, other workspace.
      for (const name of ["Dal 1kg", "Decimal above", "Split across locations", "Zero threshold", "Archived item", "Other workspace item"]) {
        expect(byName[name], name).toBeUndefined();
      }
      expect(res.total).toBe(res.alerts.length);
      expect(res.total).toBe(7); // 2 out of stock + 5 low stock
    });

    it("orders out-of-stock first, then low stock by NUMERIC ascending quantity", async () => {
      const res = await getLowStockAlerts(ex, base());
      if (!res.available) throw new Error("unavailable");
      const order = res.alerts.map((a) => `${a.status}:${a.name}`);
      expect(order.slice(0, 2)).toEqual(["OUT_OF_STOCK:No balance row", "OUT_OF_STOCK:Zero explicit"]);
      // Regression: quantities must sort numerically (2 before 10), not as text.
      const low = res.alerts.filter((a) => a.status === "LOW_STOCK").map((a) => Number(a.quantityOnHand));
      expect(low).toEqual([0.3, 1, 2, 5, 10]);
    });

    it("honours the limit but still reports the full total", async () => {
      const res = await getLowStockAlerts(ex, { ...base(), limit: 3 });
      if (!res.available) throw new Error("unavailable");
      expect(res.alerts).toHaveLength(3);
      expect(res.total).toBe(7);
    });

    it("the workspace default only affects products without their own threshold", async () => {
      const strict = await getLowStockAlerts(ex, { ...base(), defaultThreshold: "0" });
      const lenient = await getLowStockAlerts(ex, { ...base(), defaultThreshold: "1000" });
      if (!strict.available || !lenient.available) throw new Error("unavailable");
      expect(strict.alerts.map((a) => a.name)).not.toContain("Default boundary"); // 10 > 0
      expect(lenient.alerts.map((a) => a.name)).toContain("Default boundary"); // 10 <= 1000
      expect(lenient.total).toBeGreaterThan(strict.total);
      // Products with their own threshold are unaffected by the default.
      expect(strict.alerts.map((a) => a.name)).toContain("Rice 5kg");
      expect(lenient.alerts.map((a) => a.name)).not.toContain("Dal 1kg");
    });

    it("summary counts agree with the alert list; recent movements are newest-first and workspace-scoped", async () => {
      const summary = await getInventorySummary(ex, base());
      const alerts = await getLowStockAlerts(ex, base());
      if (!summary.available || !alerts.available) throw new Error("unavailable");
      expect(summary.summary.activeProducts).toBe(12); // 13 products in the workspace, 1 inactive
      expect(summary.summary.outOfStock).toBe(2);
      expect(summary.summary.lowStock).toBe(5);
      expect(summary.summary.lowStock + summary.summary.outOfStock).toBe(alerts.total);
      const recent = summary.summary.recentMovements.map((r) => r.movementType + ":" + r.quantity);
      expect(recent).toEqual(["STOCK_OUT:3.000000", "STOCK_IN:1.000000", "STOCK_OUT:2.000000", "STOCK_IN:10.000000"]);
      expect(summary.summary.recentMovements.every((r) => r.actor === "Fixture Actor")).toBe(true);
    });
  });

  describe("stock summary report", () => {
    const names = async (extra: object) => {
      const r = await getStockReport(ex, { ...base(), ...extra, limit: 100 });
      if (!r.available) throw new Error("unavailable");
      return r.rows.map((x) => x.name);
    };

    it("filters by stock status, search, and category; never leaks another workspace", async () => {
      expect(await names({ stock: "out" })).toEqual(["No balance row", "Zero explicit"]);
      expect((await names({ stock: "low" })).length).toBe(5);
      expect(await names({ stock: "in" })).toEqual(
        expect.arrayContaining(["Dal 1kg", "Decimal above", "Split across locations", "Zero threshold"]),
      );
      expect((await names({})).length).toBe(12);
      expect(await names({})).not.toContain("Other workspace item");
      expect(await names({ search: "rice" })).toEqual(["Rice 5kg"]);
      expect(await names({ search: "sku-dec" })).toEqual(["Decimal above", "Decimal low"]);
      expect(await names({ categoryId: f.category })).toEqual(["Rice 5kg"]);
      // The other workspace's product is only visible from the other workspace.
      const other = await getStockReport(ex, { ...base(), workspaceId: f.otherWs, limit: 100 });
      if (!other.available) throw new Error("unavailable");
      expect(other.rows.map((r) => r.name)).toEqual(["Other workspace item"]);
      // A category id that is not this workspace's matches nothing.
      expect(await names({ categoryId: "00000000-0000-4000-8000-000000000000" })).toEqual([]);
    });

    it("treats % and _ in the search box literally (no wildcard widening)", async () => {
      expect(await names({ search: "%" })).toEqual(["50% off _special"]);
      expect(await names({ search: "_" })).toEqual(["50% off _special"]);
    });

    it("sorts quantity numerically", async () => {
      const r = await getStockReport(ex, { ...base(), sort: "quantity", direction: "desc", limit: 100 });
      if (!r.available) throw new Error("unavailable");
      const q = r.rows.map((x) => Number(x.quantityOnHand));
      expect(q).toEqual([...q].sort((a, b) => b - a));
      expect(q[0]).toBe(500); // a text sort would put "6.000000" first
    });

    it("paginates with a stable total, and export (no limit) returns every matching row", async () => {
      const args = { ...base(), sort: "sku" as const };
      const p1 = await getStockReport(ex, { ...args, limit: 5, offset: 0 });
      const p3 = await getStockReport(ex, { ...args, limit: 5, offset: 10 });
      const all = await getStockReport(ex, args); // no limit => export mode
      if (!p1.available || !p3.available || !all.available) throw new Error("unavailable");
      expect(p1.rows).toHaveLength(5);
      expect(p1.total).toBe(12);
      expect(p3.rows).toHaveLength(2);
      expect(all.rows).toHaveLength(12);
      expect(all.total).toBe(12);
      expect(all.truncated).toBe(false);
      expect(MAX_EXPORT_ROWS).toBeGreaterThan(12);
      expect(p1.rows.map((r) => r.id)).toEqual(all.rows.slice(0, 5).map((r) => r.id));
    });

    it("sums per-location balances for the same product (same unit)", async () => {
      const r = await getStockReport(ex, { ...base(), search: "Split", limit: 5 });
      if (!r.available) throw new Error("unavailable");
      expect(r.rows[0]).toMatchObject({ quantityOnHand: "6.000000", status: "IN_STOCK" });
    });
  });

  describe("movement report: workspace-timezone date boundaries", () => {
    const run = async (extra: object, timezone = "Asia/Kolkata") => {
      const r = await getMovementReport(ex, { workspaceId: f.ws, timezone, limit: 100, ...extra });
      if (!r.available) throw new Error("unavailable");
      return { refs: r.rows.map((x) => x.reference), total: r.total, rows: r.rows };
    };

    it("from..to are inclusive whole LOCAL days (midnight-to-midnight in the workspace timezone)", async () => {
      // 2026-10-02 in IST = [2026-10-01T18:30Z, 2026-10-02T18:30Z)
      const day = await run({ from: "2026-10-02", to: "2026-10-02" });
      expect(day.refs).toEqual(["RET-3", "ISS-2"]); // 23:59:59 and 00:00:00 included, newest first
      expect(day.refs).not.toContain("INV-1"); // one second before local midnight
      expect(day.refs).not.toContain("USE-4"); // exactly the next local midnight => excluded
    });

    it("open-ended ranges", async () => {
      expect((await run({ from: "2026-10-02" })).refs).toEqual(["USE-4", "RET-3", "ISS-2"]);
      expect((await run({ to: "2026-10-01" })).refs).toEqual(["INV-1"]);
      expect((await run({ from: "2026-10-01", to: "2026-10-03" })).refs).toEqual(["USE-4", "RET-3", "ISS-2", "INV-1"]);
    });

    it("uses the workspace timezone, not UTC", async () => {
      const utc = await run({ from: "2026-10-02", to: "2026-10-02" }, "UTC");
      expect(utc.refs).toEqual(["USE-4", "RET-3"]);
    });

    it("scopes to the workspace and filters by type, search, and product", async () => {
      const all = await run({});
      expect(all.refs).not.toContain("LEAK-5");
      expect(all.total).toBe(4);
      expect((await run({ type: "STOCK_OUT" })).refs).toEqual(["USE-4", "ISS-2"]);
      expect((await run({ type: "STOCK_IN" })).refs).toEqual(["RET-3", "INV-1"]);
      expect((await run({ search: "ISS-" })).refs).toEqual(["ISS-2"]);
      expect((await run({ search: "rice" })).refs.length).toBe(4);
      expect((await run({ productId: f.p.lowAtBoundary })).refs.length).toBe(4);
      expect((await run({ productId: f.p.aboveBoundary })).refs.length).toBe(0);
      const inv = all.rows.find((r) => r.reference === "INV-1");
      expect(inv).toMatchObject({ supplierName: "Acme Traders", actor: "Fixture Actor", reasonCode: "PURCHASE" });
    });

    it("export mode returns all matching rows, not a page", async () => {
      const page = await getMovementReport(ex, { workspaceId: f.ws, timezone: "Asia/Kolkata", limit: 1, offset: 0 });
      const all = await getMovementReport(ex, { workspaceId: f.ws, timezone: "Asia/Kolkata" });
      if (!page.available || !all.available) throw new Error("unavailable");
      expect(page.rows).toHaveLength(1);
      expect(page.total).toBe(4);
      expect(all.rows).toHaveLength(4);
      expect(all.truncated).toBe(false);
    });
  });
});
