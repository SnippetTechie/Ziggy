import { sql } from "drizzle-orm";
import { pgTable, uuid, text, timestamp, jsonb, unique, primaryKey, check } from "drizzle-orm/pg-core";
import type { Role } from "../../../modules/access/policy";
export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(), clerkUserId: text("clerk_user_id").unique(), email: text().notNull().unique(), displayName: text("display_name").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const workspaces = pgTable("workspaces", {
  id: uuid().primaryKey().defaultRandom(), name: text().notNull(), slug: text().notNull().unique(), settings: jsonb().$type<{ defaultLowStockThreshold: string }>().notNull().default({ defaultLowStockThreshold: "10" }),
});
export const members = pgTable("workspace_members", {
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id), userId: uuid("user_id").notNull().references(() => users.id), role: text().$type<Role>().notNull(), status: text().$type<"ACTIVE" | "SUSPENDED">().default("ACTIVE").notNull(),
}, t => [primaryKey({ columns: [t.workspaceId, t.userId] }), check("valid_role", sql`${t.role} in ('USER','STAFF','ADMIN')`), check("valid_status", sql`${t.status} in ('ACTIVE','SUSPENDED')`)]);
export const locations = pgTable("locations", {
  id: uuid().primaryKey().defaultRandom(), workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id), name: text().notNull(), code: text().notNull(),
}, t => [unique("location_tenant_unique").on(t.id, t.workspaceId), unique("location_name_unique").on(t.workspaceId, t.name)]);
export const auditLogs = pgTable("audit_logs", {
  id: uuid().primaryKey().defaultRandom(), workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id), actorUserId: uuid("actor_user_id").notNull().references(() => users.id), action: text().notNull(), entityType: text("entity_type").notNull(), entityId: uuid("entity_id").notNull(), context: jsonb().$type<Record<string, unknown>>().notNull().default({}), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
