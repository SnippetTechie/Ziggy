import { createHash } from "node:crypto";
import Decimal from "decimal.js";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import type { Access } from "../access/policy";
import { postStockInTransaction } from "../inventory/service";
import { db } from "../../server/db";
import { balances, products, users } from "../../server/db/schema";
import { AppError, ensure } from "../../server/errors";
import { audit, checkActor } from "../../server/services/shared";
import { keyInput, positiveInput } from "../../server/validation";
import { orderItems, orders, type OrderStatus } from "./tables";

/**
 * Quantity-only customer stock requests on the existing customer_orders tables.
 * No prices, no payment. Stock changes at exactly one step: fulfilment, which posts
 * STOCK_OUT movements through the existing inventory service inside the same
 * transaction that marks the order FULFILLED.
 */
export const placeInput = z.object({
  items: z.array(z.object({ productId: z.uuid(), quantity: positiveInput }).strict()).min(1).max(20),
  note: z.string().trim().max(500).default(""),
}).strict();
export const orderAction = z.enum(["confirm", "fulfil", "cancel"]);
export type OrderAction = z.infer<typeof orderAction>;

export type OrderView = {
  id: string; ref: string; status: OrderStatus; customer: string; customerId: string; note: string; createdAt: string; updatedAt: string; processedBy: string | null;
  items: { productId: string; productName: string; sku: string; unitLabel: string; quantity: string }[];
};
const refOf = (id: string) => "REQ-" + id.slice(0, 8).toUpperCase();
const clean = (value: string) => new Decimal(value).toFixed(6);

async function load(access: Access, where: ReturnType<typeof and>, limit = 100): Promise<OrderView[]> {
  const rows = await db.select({ order: orders, processor: users.displayName }).from(orders).leftJoin(users, eq(users.id, orders.processedBy)).where(where).orderBy(desc(orders.createdAt)).limit(limit);
  if (!rows.length) return [];
  const items = await db.select().from(orderItems).where(and(eq(orderItems.workspaceId, access.workspaceId), inArray(orderItems.orderId, rows.map(r => r.order.id))));
  return rows.map(({ order, processor }) => ({
    id: order.id, ref: refOf(order.id), status: order.status, customer: order.requesterName, customerId: order.createdBy, note: order.note,
    createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString(), processedBy: processor,
    items: items.filter(item => item.orderId === order.id).map(item => ({ productId: item.productId, productName: item.productName, sku: item.sku, unitLabel: item.unitLabel, quantity: clean(item.quantity) })),
  }));
}

/** USER sees only their own requests; `all` (ADMIN only) lists the whole workspace. */
export async function listOrders(access: Access, scope: "mine" | "all", status?: OrderStatus) {
  ensure(scope === "mine" || access.role === "ADMIN", "FORBIDDEN", "Only Admins can view every customer's requests.", 403);
  const conditions = [eq(orders.workspaceId, access.workspaceId)];
  if (scope === "mine") conditions.push(eq(orders.createdBy, access.userId));
  if (status) conditions.push(eq(orders.status, status));
  return load(access, and(...conditions));
}

export async function placeOrder(access: Access, raw: z.input<typeof placeInput>, submitKey: string): Promise<OrderView> {
  const input = placeInput.parse(raw);
  keyInput.parse(submitKey);
  ensure(new Set(input.items.map(item => item.productId)).size === input.items.length, "DUPLICATE_PRODUCT", "List each product once.");
  const canonical = JSON.stringify({ u: access.userId, n: input.note, i: [...input.items].map(i => [i.productId, clean(i.quantity)]).sort() });
  const requestHash = createHash("sha256").update(canonical).digest("hex");
  const id = await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${"order:" + access.workspaceId + ":" + submitKey}, 0))`);
    const [prior] = await tx.select().from(orders).where(and(eq(orders.workspaceId, access.workspaceId), eq(orders.submitKey, submitKey)));
    if (prior) { // retry or double submit: return the original, never a second order
      ensure(prior.requestHash === requestHash && prior.createdBy === access.userId, "IDEMPOTENCY_CONFLICT", "This submission key was already used for a different request.", 409);
      return prior.id;
    }
    const [user] = await tx.select().from(users).where(eq(users.id, access.userId));
    const found = await tx.select({ product: products, quantity: sql<string>`coalesce(${balances.quantityOnHand},0)` }).from(products)
      .leftJoin(balances, and(eq(balances.productId, products.id), eq(balances.workspaceId, access.workspaceId), eq(balances.locationId, access.locationId)))
      .where(and(eq(products.workspaceId, access.workspaceId), eq(products.isActive, true), inArray(products.id, input.items.map(item => item.productId))));
    for (const item of input.items) {
      const row = found.find(candidate => candidate.product.id === item.productId);
      ensure(row, "PRODUCT_NOT_FOUND", "One of the products is not available in this store.", 404);
      ensure(new Decimal(row.quantity).gte(item.quantity), "INSUFFICIENT_STOCK", `Only ${new Decimal(row.quantity).toFixed(0)} of ${row.product.name} in stock.`);
    }
    const [order] = await tx.insert(orders).values({ workspaceId: access.workspaceId, locationId: access.locationId, createdBy: access.userId, status: "PLACED", requesterName: user?.displayName ?? "", note: input.note, submitKey, requestHash }).returning();
    await tx.insert(orderItems).values(input.items.map(item => {
      const { product } = found.find(candidate => candidate.product.id === item.productId)!;
      return { workspaceId: access.workspaceId, orderId: order.id, productId: product.id, productName: product.name, sku: product.sku, unitLabel: product.unitLabel, quantity: clean(item.quantity) };
    }));
    await audit(tx, access, "ORDER_PLACED", "customer_order", order.id, { items: input.items.length });
    return order.id;
  });
  const [view] = await load(access, and(eq(orders.workspaceId, access.workspaceId), eq(orders.id, id)));
  return view;
}

/** Admin transitions: PLACED -> CONFIRMED -> FULFILLED, or cancel before fulfilment. Each is idempotent. */
export async function transitionOrder(access: Access, orderId: string, action: OrderAction): Promise<OrderView> {
  z.uuid().parse(orderId);
  await db.transaction(async tx => {
    await checkActor(tx, access, "ADMIN");
    const [order] = await tx.select().from(orders).where(and(eq(orders.workspaceId, access.workspaceId), eq(orders.id, orderId))).for("update");
    ensure(order, "NOT_FOUND", "Order not found.", 404);
    const done: Record<OrderAction, OrderStatus> = { confirm: "CONFIRMED", fulfil: "FULFILLED", cancel: "CANCELLED" };
    if (order.status === done[action]) return; // already applied (double click / retry): nothing more happens
    const allowedFrom: Record<OrderAction, OrderStatus[]> = { confirm: ["PLACED"], fulfil: ["CONFIRMED"], cancel: ["PLACED", "CONFIRMED"] };
    ensure(allowedFrom[action].includes(order.status), "INVALID_TRANSITION", `A ${order.status.toLowerCase()} order cannot be ${action === "fulfil" ? "fulfilled" : action === "confirm" ? "confirmed" : "cancelled"}.`, 409);
    if (action === "fulfil") {
      const items = (await tx.select().from(orderItems).where(and(eq(orderItems.workspaceId, access.workspaceId), eq(orderItems.orderId, order.id)))).sort((a, b) => a.productId.localeCompare(b.productId));
      for (const item of items) {
        try {
          await postStockInTransaction(tx, access, { productId: item.productId, quantity: clean(item.quantity), reasonCode: "ISSUE", supplierId: null, unitCost: null, reference: refOf(order.id), note: `Customer stock request ${refOf(order.id)} (${order.requesterName})` }, "STOCK_OUT", `order-${order.id}-${item.productId}`);
        } catch (error) {
          if (error instanceof AppError && error.code === "INSUFFICIENT_STOCK") throw new AppError("INSUFFICIENT_STOCK", `Not enough stock to fulfil ${item.productName}. The order stays ${order.status.toLowerCase()} and no stock was changed.`, 422);
          throw error;
        }
      }
    }
    await tx.update(orders).set({ status: done[action], processedBy: access.userId, updatedAt: new Date() }).where(eq(orders.id, order.id));
    await audit(tx, access, `ORDER_${done[action]}`, "customer_order", order.id, { from: order.status });
  });
  const [view] = await load(access, and(eq(orders.workspaceId, access.workspaceId), eq(orders.id, orderId)));
  return view;
}
