import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { Access } from "../../modules/access/policy";
import { db } from "../db";
import { balances, products, categories, workspaces, movements, users, suppliers } from "../db/schema";
import { stockStatus } from "../../modules/inventory/stock-status";
import { ensure } from "../errors";

const productQuery = z.object({ search: z.string().max(180).optional(), categoryId: z.uuid().optional(), stock: z.enum(["all", "low", "out", "in"]).default("all"), status: z.enum(["active", "archived", "all"]).default("active"), limit: z.coerce.number().int().min(1).max(200).default(100), cursor: z.uuid().optional() }).strict();
export async function listProducts(access: Access, raw: Record<string, string> = {}) {
  const query = productQuery.parse(raw);
  ensure(query.status === "active" || access.role === "ADMIN", "FORBIDDEN", "Only Admins can view archived products.", 403);
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, access.workspaceId));
  const defaultThreshold = workspace?.settings.defaultLowStockThreshold ?? "10";
  const quantity = sql<string>`coalesce(${balances.quantityOnHand},0)`;
  const threshold = sql<string>`coalesce(${products.lowStockThreshold},${defaultThreshold}::numeric)`;
  const where: SQL[] = [eq(products.workspaceId, access.workspaceId)];
  if (query.status !== "all") where.push(eq(products.isActive, query.status === "active"));
  if (query.search) where.push(or(ilike(products.name, `%${query.search}%`), ilike(products.sku, `%${query.search}%`))!);
  if (query.categoryId) where.push(eq(products.categoryId, query.categoryId));
  if (query.stock === "low") where.push(sql`${quantity} <= ${threshold}`, eq(products.isActive, true));
  if (query.stock === "out") where.push(sql`${quantity} = 0`, eq(products.isActive, true));
  if (query.stock === "in") where.push(sql`${quantity} > ${threshold}`, eq(products.isActive, true));
  if (query.cursor) where.push(sql`${products.id} > ${query.cursor}::uuid`);
  const rows = await db.select({ product: products, quantity, category: categories.name }).from(products).leftJoin(balances, and(eq(balances.workspaceId, access.workspaceId), eq(balances.locationId, access.locationId), eq(balances.productId, products.id))).leftJoin(categories, and(eq(categories.id, products.categoryId), eq(categories.workspaceId, access.workspaceId))).where(and(...where)).orderBy(asc(products.id)).limit(query.limit + 1);
  const items = rows.slice(0, query.limit).map(row => ({ ...row.product, quantity: row.quantity, category: row.category, stockStatus: stockStatus(row.quantity, row.product.lowStockThreshold, defaultThreshold) }));
  return { items, nextCursor: rows.length > query.limit ? items.at(-1)!.id : null };
}
export async function getProduct(access: Access, id: string) {
  const [product] = await db.select().from(products).where(and(eq(products.id, id), eq(products.workspaceId, access.workspaceId)));
  ensure(product && (product.isActive || access.role === "ADMIN"), "NOT_FOUND", "Product not found.", 404);
  const [balance] = await db.select().from(balances).where(and(eq(balances.productId, id), eq(balances.workspaceId, access.workspaceId), eq(balances.locationId, access.locationId)));
  return { ...product, quantity: balance?.quantityOnHand ?? "0" };
}
const movementQuery = z.object({ productId: z.uuid().optional(), supplierId: z.uuid().optional(), actorId: z.uuid().optional(), type: z.enum(["STOCK_IN", "STOCK_OUT"]).optional(), from: z.iso.date().optional(), to: z.iso.date().optional(), cursor: z.uuid().optional(), limit: z.coerce.number().int().min(1).max(200).default(100) }).strict();
export async function listMovements(access: Access, raw: Record<string, string> = {}) {
  const query = movementQuery.parse(raw);
  const conditions: SQL[] = [eq(movements.workspaceId, access.workspaceId)];
  if (query.productId) conditions.push(eq(movements.productId, query.productId));
  if (query.supplierId) conditions.push(eq(movements.supplierId, query.supplierId));
  if (query.actorId) conditions.push(eq(movements.createdBy, query.actorId));
  if (query.type) conditions.push(eq(movements.movementType, query.type));
  if (query.from) conditions.push(sql`${movements.createdAt} >= ${query.from}::date`);
  if (query.to) conditions.push(sql`${movements.createdAt} < ${query.to}::date + interval '1 day'`);
  if (query.cursor) {
    const [anchor] = await db.select({ date: movements.createdAt, id: movements.id }).from(movements).where(and(eq(movements.id, query.cursor), eq(movements.workspaceId, access.workspaceId)));
    ensure(anchor, "INVALID_CURSOR", "Invalid page cursor.", 400);
    conditions.push(sql`(${movements.createdAt},${movements.id}) < (${anchor.date.toISOString()}::timestamptz,${anchor.id}::uuid)`);
  }
  const rows = await db.select({ movement: movements, productName: products.name, sku: products.sku, actor: users.displayName, supplier: suppliers.name }).from(movements).innerJoin(products, and(eq(products.id, movements.productId), eq(products.workspaceId, access.workspaceId))).innerJoin(users, eq(users.id, movements.createdBy)).leftJoin(suppliers, and(eq(suppliers.id, movements.supplierId), eq(suppliers.workspaceId, access.workspaceId))).where(and(...conditions)).orderBy(desc(movements.createdAt), desc(movements.id)).limit(query.limit + 1);
  const items = rows.slice(0, query.limit).map(row => ({ ...row.movement, productName: row.productName, sku: row.sku, actor: row.actor, supplier: row.supplier }));
  return { items, nextCursor: rows.length > query.limit ? items.at(-1)!.id : null };
}
export async function summary(access: Access) {
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, access.workspaceId));
  const threshold = workspace?.settings.defaultLowStockThreshold ?? "10";
  const quantity = sql`coalesce(${balances.quantityOnHand},0)`;
  const [totals] = await db.select({ products: sql<number>`count(*)::int`, out: sql<number>`count(*) filter (where ${quantity}=0)::int`, low: sql<number>`count(*) filter (where ${quantity}<=coalesce(${products.lowStockThreshold},${threshold}::numeric))::int` }).from(products).leftJoin(balances, and(eq(balances.productId, products.id), eq(balances.workspaceId, access.workspaceId), eq(balances.locationId, access.locationId))).where(and(eq(products.workspaceId, access.workspaceId), eq(products.isActive, true)));
  const recent = await listMovements(access, { limit: "10" });
  return { ...totals, workspace: workspace?.name ?? "Ziggy", recent: recent.items };
}
