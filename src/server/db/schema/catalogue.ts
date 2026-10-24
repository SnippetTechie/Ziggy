import { sql } from "drizzle-orm";
import { pgTable, uuid, text, boolean, numeric, unique, foreignKey, check, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./identity";
export const categories = pgTable("product_categories", {
  id: uuid().primaryKey().defaultRandom(), workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id), name: text().notNull(),
}, t => [unique("category_name_unique").on(t.workspaceId, t.name), unique("category_tenant_unique").on(t.id, t.workspaceId)]);
export const suppliers = pgTable("suppliers", {
  id: uuid().primaryKey().defaultRandom(), workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id), name: text().notNull(), email: text().notNull().default(""), phone: text().notNull().default(""), address: text().notNull().default(""), isActive: boolean("is_active").notNull().default(true),
}, t => [unique("supplier_tenant_unique").on(t.id, t.workspaceId)]);
export const products = pgTable("products", {
  id: uuid().primaryKey().defaultRandom(), workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id), sku: text().notNull(), name: text().notNull(), description: text().notNull().default(""), categoryId: uuid("category_id"), unitLabel: text("unit_label").notNull().default("pcs"), lowStockThreshold: numeric("low_stock_threshold", { precision: 20, scale: 6 }), isActive: boolean("is_active").notNull().default(true), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [unique("sku_per_workspace").on(t.workspaceId, t.sku), unique("product_tenant_unique").on(t.id, t.workspaceId), foreignKey({ columns: [t.categoryId, t.workspaceId], foreignColumns: [categories.id, categories.workspaceId] }), check("nonnegative_threshold", sql`${t.lowStockThreshold} >= 0`)]);
