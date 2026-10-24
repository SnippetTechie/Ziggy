import { pgTable, uuid, text, numeric, timestamp } from "drizzle-orm/pg-core";

/**
 * Typed mirror of the EXISTING live tables `customer_orders` / `customer_order_items`
 * (created outside this repo; empty until this feature). Deliberately NOT exported from
 * src/server/db/schema, so drizzle-kit never generates a CREATE TABLE migration for them.
 * Never apply a migration for these tables to the shared database.
 */
export const orders = pgTable("customer_orders", {
  id: uuid().primaryKey().defaultRandom(), workspaceId: uuid("workspace_id").notNull(), locationId: uuid("location_id").notNull(), createdBy: uuid("created_by").notNull(),
  status: text().$type<OrderStatus>().notNull().default("PLACED"), requesterName: text("requester_name").notNull().default(""), note: text().notNull().default(""),
  submitKey: text("submit_key").notNull(), requestHash: text("request_hash").notNull(), processedBy: uuid("processed_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const orderItems = pgTable("customer_order_items", {
  id: uuid().primaryKey().defaultRandom(), workspaceId: uuid("workspace_id").notNull(), orderId: uuid("order_id").notNull(), productId: uuid("product_id").notNull(),
  productName: text("product_name").notNull(), sku: text().notNull(), unitLabel: text("unit_label").notNull(), quantity: numeric().notNull(),
});
export type OrderStatus = "PLACED" | "CONFIRMED" | "FULFILLED" | "CANCELLED";
