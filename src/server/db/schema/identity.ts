/**
 * Identity tables: users, workspaces, workspace_members, locations, audit_logs.
 *
 * These MIRROR tables that already exist in the shared dev database (created
 * by the teammate's migration, which is not on origin/main). Column names,
 * constraints, and index names match the live database exactly so that a later
 * drizzle-kit diff reports no drift. Do NOT run `db:generate`/`db:migrate`
 * against the shared database from this file — see TEAM_HANDOFF.md §8.
 *
 * Owner: Shoaeb (identity). Doc 03 "MVP data model".
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull(),
    email: text("email"),
    displayName: text("display_name"),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
  },
  (t) => [unique("users_clerk_user_id_unique").on(t.clerkUserId)],
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    defaultCurrency: char("default_currency", { length: 3 }).notNull().default("INR"),
    timezone: text("timezone").notNull().default("Asia/Kolkata"),
    settings: jsonb("settings").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
  },
  (t) => [unique("workspaces_slug_unique").on(t.slug)],
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    role: text("role").notNull(),
    status: text("status").notNull().default("ACTIVE"),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ name: "workspace_members_workspace_id_user_id_pk", columns: [t.workspaceId, t.userId] }),
    index("workspace_members_user_idx").on(t.userId),
    check("workspace_members_role_check", sql`${t.role} = ANY (ARRAY['USER'::text, 'STAFF'::text, 'ADMIN'::text])`),
    check("workspace_members_status_check", sql`${t.status} = ANY (ARRAY['ACTIVE'::text, 'SUSPENDED'::text])`),
  ],
);

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    code: text("code").notNull(),
    locationType: text("location_type").notNull().default("BRANCH"),
    address: jsonb("address"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
    updatedAt: timestamptz("updated_at").notNull().defaultNow(),
  },
  (t) => [
    unique("locations_workspace_code_unique").on(t.workspaceId, t.code),
    unique("locations_workspace_id_unique").on(t.workspaceId, t.id),
    check("locations_type_check", sql`${t.locationType} = ANY (ARRAY['BRANCH'::text, 'WAREHOUSE'::text])`),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    context: jsonb("context").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamptz("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_logs_workspace_created_idx").on(t.workspaceId, t.createdAt.desc())],
);
