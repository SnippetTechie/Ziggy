import { asc, eq } from "drizzle-orm";
import { users, workspaceMembers, workspaces } from "@/server/db/schema";
import type { Executor } from "@/server/db/types";
import { isRole, type Role } from "./roles";

/** An ACTIVE member of a workspace, resolved from Ziggy's own database. */
export type Access = {
  clerkUserId: string;
  userId: string;
  workspaceId: string;
  workspaceName: string;
  workspaceTimezone: string;
  /** Raw workspace settings JSON; use parseDefaultThreshold() to read from it. */
  workspaceSettings: unknown;
  role: Role;
};

export type AccessState =
  | { status: "unauthenticated" }
  | { status: "no-membership"; clerkUserId: string; userId: string | null }
  | { status: "suspended"; clerkUserId: string; userId: string }
  | { status: "ok"; access: Access };

/**
 * Resolve workspace access for a Clerk identity. Clerk proves identity only;
 * this decides access from `workspace_members` (role + ACTIVE status).
 *
 * Fails closed: an unknown role string, a missing workspace, or a SUSPENDED
 * membership never produces an "ok" state, and nothing is ever created here.
 */
export async function resolveAccess(ex: Executor, clerkUserId: string): Promise<AccessState> {
  const rows = await ex
    .select({
      userId: users.id,
      workspaceId: workspaces.id,
      workspaceName: workspaces.name,
      timezone: workspaces.timezone,
      settings: workspaces.settings,
      role: workspaceMembers.role,
      status: workspaceMembers.status,
    })
    .from(users)
    .leftJoin(workspaceMembers, eq(workspaceMembers.userId, users.id))
    .leftJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(users.clerkUserId, clerkUserId))
    .orderBy(asc(workspaceMembers.createdAt));

  if (rows.length === 0) return { status: "no-membership", clerkUserId, userId: null };

  const active = rows.find(
    (r) => r.status === "ACTIVE" && r.workspaceId !== null && r.workspaceName !== null && isRole(r.role),
  );
  if (active && active.workspaceId && active.workspaceName && isRole(active.role)) {
    return {
      status: "ok",
      access: {
        clerkUserId,
        userId: active.userId,
        workspaceId: active.workspaceId,
        workspaceName: active.workspaceName,
        workspaceTimezone: active.timezone ?? "Asia/Kolkata",
        workspaceSettings: active.settings,
        role: active.role,
      },
    };
  }

  if (rows.some((r) => r.status === "SUSPENDED")) {
    return { status: "suspended", clerkUserId, userId: rows[0].userId };
  }
  return { status: "no-membership", clerkUserId, userId: rows[0].userId };
}

/**
 * Create the internal `users` row for a Clerk identity if missing. This is
 * identity only: it grants no membership and no role. Returns the internal id.
 */
export async function ensureUserRow(
  ex: Executor,
  input: { clerkUserId: string; email?: string | null; displayName?: string | null },
): Promise<string> {
  const [row] = await ex
    .insert(users)
    .values({
      clerkUserId: input.clerkUserId,
      email: input.email ?? null,
      displayName: input.displayName ?? null,
    })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      // Only refresh profile fields; never touch ids or memberships.
      set: {
        email: input.email ?? undefined,
        displayName: input.displayName ?? undefined,
        updatedAt: new Date(),
      },
    })
    .returning({ id: users.id });
  return row.id;
}

export type DefaultWorkspace = { id: string; name: string; timezone: string; settings: unknown };

/**
 * The single seeded workspace that access requests are scoped to. Returns null
 * when there is not exactly one workspace, so a request can never be attached
 * to an arbitrary or ambiguous tenant.
 */
export async function getDefaultWorkspace(ex: Executor): Promise<DefaultWorkspace | null> {
  const rows = await ex
    .select({ id: workspaces.id, name: workspaces.name, timezone: workspaces.timezone, settings: workspaces.settings })
    .from(workspaces)
    .limit(2);
  return rows.length === 1 ? rows[0] : null;
}
