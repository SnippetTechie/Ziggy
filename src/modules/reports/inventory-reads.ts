/**
 * Read-only inventory queries for the dashboard, alerts, and reports.
 *
 * These consume the agreed MVP data model (doc 03 "MVP data model") owned by
 * Teammates 1 and 2: products, product_categories, suppliers,
 * inventory_balances, stock_movements. Those tables are NOT on origin/main yet,
 * so every public function first probes for them and returns
 * `{ available: false }` instead of failing or inventing data.
 *
 * All queries filter by the caller's workspace_id, which always comes from
 * server-side access resolution — never from the request.
 */
import { sql, type SQL } from "drizzle-orm";
import type { Executor } from "@/server/db/types";
import { isLowStock, stockStatus, type StockStatus } from "@/modules/inventory/stock-status";

export const REQUIRED_TABLES = [
  "products",
  "product_categories",
  "inventory_balances",
  "stock_movements",
  "suppliers",
] as const;

export type Availability = { available: true } | { available: false; missing: string[] };
export type Read<T> = ({ available: true } & T) | { available: false; missing: string[] };

export const MAX_PAGE_SIZE = 200;
export const MAX_EXPORT_ROWS = 50_000;

/** Probe the search path (not a hard-coded schema) for the contract tables. */
export async function inventoryAvailability(ex: Executor): Promise<Availability> {
  const probes = REQUIRED_TABLES.map((t) => sql`to_regclass(${t}) is not null as ${sql.raw(t)}`);
  const res = await ex.execute(sql`select ${sql.join(probes, sql`, `)}`);
  const row = (res.rows[0] ?? {}) as Record<string, boolean>;
  const missing = REQUIRED_TABLES.filter((t) => row[t] !== true);
  return missing.length === 0 ? { available: true } : { available: false, missing: [...missing] };
}

/** Active products with their on-hand quantity (0 when no balance row) and threshold. */
function stockCte(workspaceId: string, defaultThreshold: string): SQL {
  return sql`stock as (
    select p.id, p.sku, p.name, p.unit_label, p.category_id, c.name as category_name,
           coalesce(b.qty, 0) as quantity_on_hand,
           coalesce(p.low_stock_threshold, ${defaultThreshold}::numeric) as threshold
      from products p
      left join product_categories c on c.id = p.category_id and c.workspace_id = p.workspace_id
      left join (
        select product_id, sum(quantity_on_hand) as qty
          from inventory_balances
         where workspace_id = ${workspaceId}
         group by product_id
      ) b on b.product_id = p.id
     where p.workspace_id = ${workspaceId} and p.is_active
  )`;
}

export type StockRow = {
  id: string;
  sku: string;
  name: string;
  unitLabel: string | null;
  categoryName: string | null;
  quantityOnHand: string;
  threshold: string;
  status: StockStatus;
};

type RawStockRow = {
  id: string;
  sku: string;
  name: string;
  unit_label: string | null;
  category_name: string | null;
  quantity_on_hand: string;
  threshold: string;
  total?: number;
};

function mapStock(r: RawStockRow): StockRow {
  return {
    id: r.id,
    sku: r.sku,
    name: r.name,
    unitLabel: r.unit_label,
    categoryName: r.category_name,
    quantityOnHand: r.quantity_on_hand,
    threshold: r.threshold,
    // Same rule as the SQL predicate, evaluated with decimal arithmetic.
    status: stockStatus(r.quantity_on_hand, r.threshold),
  };
}

// ---------------------------------------------------------------- summary

export type RecentMovement = {
  id: string;
  occurredAt: string;
  movementType: string;
  reasonCode: string;
  quantity: string;
  productName: string;
  sku: string;
  unitLabel: string | null;
  actor: string | null;
};

export type InventorySummary = {
  /** Counts only. Quantities in different units are never summed. */
  activeProducts: number;
  lowStock: number;
  outOfStock: number;
  recentMovements: RecentMovement[];
};

export async function getInventorySummary(
  ex: Executor,
  input: { workspaceId: string; defaultThreshold: string; recentLimit?: number },
): Promise<Read<{ summary: InventorySummary }>> {
  const availability = await inventoryAvailability(ex);
  if (!availability.available) return availability;

  const counts = await ex.execute(sql`
    with ${stockCte(input.workspaceId, input.defaultThreshold)}
    select count(*)::int as active_products,
           count(*) filter (where quantity_on_hand <= 0)::int as out_of_stock,
           count(*) filter (where quantity_on_hand > 0 and quantity_on_hand <= threshold)::int as low_stock
      from stock`);
  const c = (counts.rows[0] ?? {}) as { active_products?: number; out_of_stock?: number; low_stock?: number };

  const limit = Math.min(Math.max(input.recentLimit ?? 8, 1), 50);
  const recent = await ex.execute(sql`
    select m.id, m.occurred_at, m.movement_type, m.reason_code, m.quantity::text as quantity,
           p.name as product_name, p.sku, p.unit_label,
           coalesce(u.display_name, u.email) as actor
      from stock_movements m
      join products p on p.id = m.product_id and p.workspace_id = m.workspace_id
      left join users u on u.id = m.created_by
     where m.workspace_id = ${input.workspaceId}
     order by m.occurred_at desc, m.id desc
     limit ${limit}`);

  return {
    available: true,
    summary: {
      activeProducts: c.active_products ?? 0,
      lowStock: c.low_stock ?? 0,
      outOfStock: c.out_of_stock ?? 0,
      recentMovements: (recent.rows as Record<string, unknown>[]).map(mapMovementRow),
    },
  };
}

function mapMovementRow(r: Record<string, unknown>): RecentMovement {
  return {
    id: String(r.id),
    occurredAt: new Date(r.occurred_at as string | Date).toISOString(),
    movementType: String(r.movement_type),
    reasonCode: String(r.reason_code),
    quantity: String(r.quantity),
    productName: String(r.product_name),
    sku: String(r.sku),
    unitLabel: (r.unit_label as string | null) ?? null,
    actor: (r.actor as string | null) ?? null,
  };
}

// ----------------------------------------------------------------- alerts

export async function getLowStockAlerts(
  ex: Executor,
  input: { workspaceId: string; defaultThreshold: string; limit?: number },
): Promise<Read<{ alerts: StockRow[]; total: number }>> {
  const availability = await inventoryAvailability(ex);
  if (!availability.available) return availability;

  const limit = Math.min(Math.max(input.limit ?? 50, 1), MAX_PAGE_SIZE);
  const res = await ex.execute(sql`
    with ${stockCte(input.workspaceId, input.defaultThreshold)}
    select id, sku, name, unit_label, category_name,
           quantity_on_hand::text as quantity_on_hand, threshold::text as threshold,
           count(*) over()::int as total
      from stock
     where quantity_on_hand <= threshold
     order by (stock.quantity_on_hand > 0), stock.quantity_on_hand asc, stock.name asc, stock.id asc
     limit ${limit}`);
  const rows = res.rows as RawStockRow[];
  return { available: true, alerts: rows.map(mapStock), total: rows[0]?.total ?? 0 };
}

// ----------------------------------------------------------- stock report

export type StockFilter = "all" | "low" | "out" | "in";
export type StockSortKey = "name" | "sku" | "quantity" | "status";

const STOCK_ORDER: Record<StockSortKey, SQL> = {
  name: sql`name`,
  sku: sql`sku`,
  // Qualified: the SELECT aliases quantity_on_hand::text, and a bare name in ORDER BY would sort that text.
  quantity: sql`stock.quantity_on_hand`,
  // Out of stock first, then low, then healthy.
  status: sql`case when quantity_on_hand <= 0 then 0 when quantity_on_hand <= threshold then 1 else 2 end`,
};

export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export type StockReportInput = {
  workspaceId: string;
  defaultThreshold: string;
  search?: string;
  categoryId?: string;
  stock?: StockFilter;
  sort?: StockSortKey;
  direction?: "asc" | "desc";
  /** Omit limit to export everything that matches (CSV). */
  limit?: number;
  offset?: number;
};

export type StockReport = { rows: StockRow[]; total: number; truncated: boolean };

export async function getStockReport(ex: Executor, input: StockReportInput): Promise<Read<StockReport>> {
  const availability = await inventoryAvailability(ex);
  if (!availability.available) return availability;

  const conds: SQL[] = [];
  if (input.search) {
    const like = `%${escapeLike(input.search)}%`;
    conds.push(sql`(name ilike ${like} escape '\\' or sku ilike ${like} escape '\\')`);
  }
  if (input.categoryId) conds.push(sql`category_id = ${input.categoryId}`);
  switch (input.stock ?? "all") {
    case "low":
      conds.push(sql`quantity_on_hand > 0 and quantity_on_hand <= threshold`);
      break;
    case "out":
      conds.push(sql`quantity_on_hand <= 0`);
      break;
    case "in":
      conds.push(sql`quantity_on_hand > threshold`);
      break;
  }
  const where = conds.length ? sql`where ${sql.join(conds, sql` and `)}` : sql``;
  const order = STOCK_ORDER[input.sort ?? "name"];
  const dir = input.direction === "desc" ? sql`desc` : sql`asc`;

  const exporting = input.limit === undefined;
  const limit = exporting ? MAX_EXPORT_ROWS + 1 : Math.min(Math.max(input.limit ?? 50, 1), MAX_PAGE_SIZE);
  const offset = exporting ? 0 : Math.max(input.offset ?? 0, 0);

  const res = await ex.execute(sql`
    with ${stockCte(input.workspaceId, input.defaultThreshold)}
    select id, sku, name, unit_label, category_name,
           quantity_on_hand::text as quantity_on_hand, threshold::text as threshold,
           count(*) over()::int as total
      from stock
      ${where}
     order by ${order} ${dir}, stock.name asc, stock.id asc
     limit ${limit} offset ${offset}`);
  let rows = res.rows as RawStockRow[];
  const total = rows[0]?.total ?? 0;
  const truncated = exporting && rows.length > MAX_EXPORT_ROWS;
  if (truncated) rows = rows.slice(0, MAX_EXPORT_ROWS);
  return { available: true, rows: rows.map(mapStock), total, truncated };
}

// -------------------------------------------------------- movement report

export type MovementReportInput = {
  workspaceId: string;
  /** Workspace timezone; the date range is interpreted in it. */
  timezone: string;
  from?: string;
  to?: string;
  type?: "STOCK_IN" | "STOCK_OUT";
  productId?: string;
  search?: string;
  /** Omit limit to export everything that matches (CSV). */
  limit?: number;
  offset?: number;
};

export type MovementRow = RecentMovement & {
  balanceAfter: string | null;
  supplierName: string | null;
  reference: string | null;
  note: string | null;
};

export type MovementReport = { rows: MovementRow[]; total: number; truncated: boolean };

export async function getMovementReport(ex: Executor, input: MovementReportInput): Promise<Read<MovementReport>> {
  const availability = await inventoryAvailability(ex);
  if (!availability.available) return availability;

  const conds: SQL[] = [sql`m.workspace_id = ${input.workspaceId}`];
  // Inclusive of both whole local days: [from 00:00, day-after-to 00:00).
  if (input.from) conds.push(sql`m.occurred_at >= (${input.from}::date)::timestamp at time zone ${input.timezone}`);
  if (input.to) conds.push(sql`m.occurred_at < ((${input.to}::date + 1)::timestamp at time zone ${input.timezone})`);
  if (input.type) conds.push(sql`m.movement_type = ${input.type}`);
  if (input.productId) conds.push(sql`m.product_id = ${input.productId}`);
  if (input.search) {
    const like = `%${escapeLike(input.search)}%`;
    conds.push(
      sql`(p.name ilike ${like} escape '\\' or p.sku ilike ${like} escape '\\' or m.reference ilike ${like} escape '\\')`,
    );
  }

  const exporting = input.limit === undefined;
  const limit = exporting ? MAX_EXPORT_ROWS + 1 : Math.min(Math.max(input.limit ?? 50, 1), MAX_PAGE_SIZE);
  const offset = exporting ? 0 : Math.max(input.offset ?? 0, 0);

  const res = await ex.execute(sql`
    select m.id, m.occurred_at, m.movement_type, m.reason_code, m.quantity::text as quantity,
           m.balance_after::text as balance_after, m.reference, m.note,
           p.name as product_name, p.sku, p.unit_label,
           s.name as supplier_name,
           coalesce(u.display_name, u.email) as actor,
           count(*) over()::int as total
      from stock_movements m
      join products p on p.id = m.product_id and p.workspace_id = m.workspace_id
      left join suppliers s on s.id = m.supplier_id and s.workspace_id = m.workspace_id
      left join users u on u.id = m.created_by
     where ${sql.join(conds, sql` and `)}
     order by m.occurred_at desc, m.id desc
     limit ${limit} offset ${offset}`);

  let raw = res.rows as Record<string, unknown>[];
  const total = Number(raw[0]?.total ?? 0);
  const truncated = exporting && raw.length > MAX_EXPORT_ROWS;
  if (truncated) raw = raw.slice(0, MAX_EXPORT_ROWS);
  return {
    available: true,
    total,
    truncated,
    rows: raw.map((r) => ({
      ...mapMovementRow(r),
      balanceAfter: (r.balance_after as string | null) ?? null,
      supplierName: (r.supplier_name as string | null) ?? null,
      reference: (r.reference as string | null) ?? null,
      note: (r.note as string | null) ?? null,
    })),
  };
}

export { isLowStock };
