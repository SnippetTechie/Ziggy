import { sql } from "drizzle-orm";
import { locations, users, workspaces } from "@/server/db/schema";
import type { Executor } from "@/server/db/types";

/**
 * Fixture data for report tests, inserted into the REAL tables inside a
 * transaction the caller always rolls back (see withRollback). Only the
 * identity tables use Drizzle models (we own them); the catalogue/inventory
 * tables belong to other teammates, so they are written with plain SQL against
 * the columns in doc 03's MVP data model.
 */
export const DEFAULT_THRESHOLD = "10";

export type Fixture = Awaited<ReturnType<typeof createInventoryFixture>>;

export async function createInventoryFixture(ex: Executor) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const mkWorkspace = async (name: string, timezone: string) =>
    (
      await ex
        .insert(workspaces)
        .values({ name, slug: `${name}-${stamp}`, timezone, settings: { defaultLowStockThreshold: Number(DEFAULT_THRESHOLD) } })
        .returning({ id: workspaces.id })
    )[0].id;
  const mkLocation = async (workspaceId: string, code: string) =>
    (await ex.insert(locations).values({ workspaceId, name: code, code }).returning({ id: locations.id }))[0].id;

  const ws = await mkWorkspace("fx-main", "Asia/Kolkata");
  const otherWs = await mkWorkspace("fx-other", "Asia/Kolkata");
  const loc = await mkLocation(ws, "MAIN");
  const loc2 = await mkLocation(ws, "ANNEX");
  const otherLoc = await mkLocation(otherWs, "MAIN");
  const actor = (
    await ex.insert(users).values({ clerkUserId: `fx-${stamp}`, email: `fx-${stamp}@example.test`, displayName: "Fixture Actor" }).returning({ id: users.id })
  )[0].id;

  const scalar = async (q: ReturnType<typeof sql>) => (((await ex.execute(q)).rows[0] ?? {}) as { id: string }).id;

  const category = await scalar(sql`insert into product_categories (workspace_id, name) values (${ws}, 'Grains') returning id`);
  const supplier = await scalar(sql`insert into suppliers (workspace_id, name) values (${ws}, 'Acme Traders') returning id`);

  const product = (
    workspaceId: string,
    sku: string,
    name: string,
    o: { threshold?: string | null; active?: boolean; categoryId?: string | null; unit?: string } = {},
  ) =>
    scalar(sql`insert into products (workspace_id, sku, name, unit_label, low_stock_threshold, is_active, category_id)
               values (${workspaceId}, ${sku}, ${name}, ${o.unit ?? "pcs"}, ${o.threshold ?? null}, ${o.active ?? true}, ${o.categoryId ?? null})
               returning id`);

  const balance = (workspaceId: string, locationId: string, productId: string, qty: string) =>
    ex.execute(sql`insert into inventory_balances (workspace_id, location_id, product_id, quantity_on_hand)
                   values (${workspaceId}, ${locationId}, ${productId}, ${qty})`);

  const movement = (m: {
    workspaceId: string;
    locationId: string;
    productId: string;
    type: "STOCK_IN" | "STOCK_OUT";
    reason: string;
    quantity: string;
    at: string;
    reference?: string | null;
    supplierId?: string | null;
    balanceAfter?: string;
  }) =>
    scalar(sql`insert into stock_movements
                 (workspace_id, location_id, product_id, movement_type, reason_code, quantity, balance_after, supplier_id, reference, created_by, occurred_at)
               values (${m.workspaceId}, ${m.locationId}, ${m.productId}, ${m.type}, ${m.reason}, ${m.quantity}, ${m.balanceAfter ?? "100"},
                       ${m.supplierId ?? null}, ${m.reference ?? null}, ${actor}, ${m.at}::timestamptz)
               returning id`);

  // ---- products in the main workspace -------------------------------------
  const p = {
    lowAtBoundary: await product(ws, "SKU-LOW", "Rice 5kg", { threshold: "5", categoryId: category, unit: "bag" }), // qty 5 == thr 5
    aboveBoundary: await product(ws, "SKU-ABOVE", "Dal 1kg", { threshold: "5", unit: "kg" }), // qty 5.000001 > thr 5
    noBalanceRow: await product(ws, "SKU-NOROW", "No balance row"), // no inventory_balances row, default threshold
    zeroExplicit: await product(ws, "SKU-ZERO", "Zero explicit", { threshold: "0" }), // qty 0, thr 0
    inactive: await product(ws, "SKU-OLD", "Archived item", { active: false }), // qty 0 but inactive
    defaultBoundary: await product(ws, "SKU-DEF", "Default boundary"), // qty == workspace default (10)
    decimalLow: await product(ws, "SKU-DEC", "Decimal low", { threshold: "0.3" }), // 0.3 <= 0.3
    decimalAbove: await product(ws, "SKU-DEC2", "Decimal above", { threshold: "0.3" }), // 0.300001 > 0.3
    split: await product(ws, "SKU-SPLIT", "Split across locations", { threshold: "5" }), // 3 + 3 = 6 > 5
    wildcards: await product(ws, "SKU-PCT", "50% off _special", { threshold: "100" }), // low; name has LIKE wildcards
    zeroThreshold: await product(ws, "SKU-ZT", "Zero threshold", { threshold: "0" }), // qty 0.5, thr 0 => in stock
    formula: await product(ws, "SKU-FX", '=HYPERLINK("http://evil.example","click")', { threshold: "100" }), // CSV injection payload
    comma: await product(ws, "SKU-CM", 'Salt, "iodised"', { threshold: "100" }),
  };
  const otherProduct = await product(otherWs, "SKU-OTHER", "Other workspace item"); // qty 0, must never leak

  await balance(ws, loc, p.lowAtBoundary, "5");
  await balance(ws, loc, p.aboveBoundary, "5.000001");
  await balance(ws, loc, p.zeroExplicit, "0");
  await balance(ws, loc, p.inactive, "0");
  await balance(ws, loc, p.defaultBoundary, "10");
  await balance(ws, loc, p.decimalLow, "0.3");
  await balance(ws, loc, p.decimalAbove, "0.300001");
  await balance(ws, loc, p.split, "3");
  await balance(ws, loc2, p.split, "3");
  await balance(ws, loc, p.wildcards, "1");
  await balance(ws, loc, p.zeroThreshold, "0.5");
  await balance(ws, loc, p.formula, "2");
  await balance(ws, loc, p.comma, "500");
  await balance(otherWs, otherLoc, otherProduct, "0");

  // ---- movements: boundaries of local day 2026-10-02 in Asia/Kolkata (UTC+5:30) ----
  const base = { workspaceId: ws, locationId: loc, productId: p.lowAtBoundary };
  const m = {
    justBeforeDay: await movement({ ...base, type: "STOCK_IN", reason: "PURCHASE", quantity: "10", at: "2026-10-01T18:29:59Z", reference: "INV-1", supplierId: supplier }), // Oct 1 23:59:59 IST
    startOfDay: await movement({ ...base, type: "STOCK_OUT", reason: "ISSUE", quantity: "2", at: "2026-10-01T18:30:00Z", reference: "ISS-2" }), // Oct 2 00:00:00 IST
    endOfDay: await movement({ ...base, type: "STOCK_IN", reason: "RETURN_IN", quantity: "1", at: "2026-10-02T18:29:59Z", reference: "RET-3" }), // Oct 2 23:59:59 IST
    nextDay: await movement({ ...base, type: "STOCK_OUT", reason: "USED", quantity: "3", at: "2026-10-02T18:30:00Z", reference: "USE-4" }), // Oct 3 00:00:00 IST
    otherWorkspace: await movement({ workspaceId: otherWs, locationId: otherLoc, productId: otherProduct, type: "STOCK_IN", reason: "PURCHASE", quantity: "7", at: "2026-10-02T06:00:00Z", reference: "LEAK-5" }),
  };

  return { ws, otherWs, loc, loc2, actor, category, supplier, p, otherProduct, m, scalar, product, balance, movement };
}
