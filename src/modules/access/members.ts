/**
 * Workspace member management (ADMIN only; enforced by the route guard).
 *
 * - Access is granted only by an Admin, never automatically on sign-up.
 * - "Pending" users are those who explicitly asked for access to THIS
 *   workspace (an ACCESS_REQUESTED audit row). Global Clerk/`users` rows with
 *   no request are never listed or grantable, so other tenants' signups are not
 *   exposed.
 * - The last ACTIVE admin can never be demoted or suspended.
 *
 * Proposed follow-up (needs schema coordination, not done here): a dedicated
 * `access_requests` table instead of reusing `audit_logs`.
 */
import { and, asc, eq, exists, sql } from "drizzle-orm";
import { auditLogs, users, workspaceMembers } from "@/server/db/schema";
import type { Executor } from "@/server/db/types";
import { isRole, type Role } from "@/server/authorization/roles";

export type MemberStatus = "ACTIVE" | "SUSPENDED";

export class MemberError extends Error {
  constructor(
    readonly code: "NOT_FOUND" | "LAST_ADMIN" | "NOT_PENDING" | "ALREADY_MEMBER" | "INVALID_CHANGE",
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const ACCESS_REQUESTED = "ACCESS_REQUESTED";

export async function writeAudit(
  ex: Executor,
  entry: {
    workspaceId: string;
    actorUserId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    context?: Record<string, unknown>;
  },
): Promise<void> {
  await ex.insert(auditLogs).values({
    workspaceId: entry.workspaceId,
    actorUserId: entry.actorUserId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    context: entry.context ?? {},
  });
}

export type MemberRow = {
  userId: string;
  displayName: string | null;
  email: string | null;
  role: Role;
  status: MemberStatus;
  joinedAt: string;
};

export async function listMembers(ex: Executor, workspaceId: string): Promise<MemberRow[]> {
  const rows = await ex
    .select({
      userId: users.id,
      displayName: users.displayName,
      email: users.email,
      role: workspaceMembers.role,
      status: workspaceMembers.status,
      joinedAt: workspaceMembers.createdAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(asc(workspaceMembers.createdAt), asc(users.id));
  return rows
    .filter((r) => isRole(r.role) && (r.status === "ACTIVE" || r.status === "SUSPENDED"))
    .map((r) => ({
      userId: r.userId,
      displayName: r.displayName,
      email: r.email,
      role: r.role as Role,
      status: r.status as MemberStatus,
      joinedAt: r.joinedAt.toISOString(),
    }));
}

export type PendingRow = { userId: string; displayName: string | null; email: string | null; requestedAt: string };

/** Users who asked for access to this workspace and have no membership in it. */
export async function listPendingRequests(ex: Executor, workspaceId: string): Promise<PendingRow[]> {
  const rows = await ex
    .select({
      userId: users.id,
      displayName: users.displayName,
      email: users.email,
      requestedAt: sql<Date>`min(${auditLogs.createdAt})`,
    })
    .from(auditLogs)
    .innerJoin(users, eq(users.id, auditLogs.actorUserId))
    .where(
      and(
        eq(auditLogs.workspaceId, workspaceId),
        eq(auditLogs.action, ACCESS_REQUESTED),
        sql`not ${exists(
          ex
            .select({ one: sql`1` })
            .from(workspaceMembers)
            .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, users.id))),
        )}`,
      ),
    )
    .groupBy(users.id, users.displayName, users.email)
    .orderBy(sql`min(${auditLogs.createdAt}) asc`)
    .limit(200);
  return rows.map((r) => ({
    userId: r.userId,
    displayName: r.displayName,
    email: r.email,
    requestedAt: new Date(r.requestedAt).toISOString(),
  }));
}

export type RequestAccessResult = "requested" | "already-requested" | "already-member";

/** A signed-in user without membership asks for access to the workspace. Idempotent. */
export async function requestAccess(ex: Executor, input: { userId: string; workspaceId: string }): Promise<RequestAccessResult> {
  return ex.transaction(async (tx) => {
    const [member] = await tx
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, input.workspaceId), eq(workspaceMembers.userId, input.userId)))
      .limit(1);
    if (member) return "already-member";

    const [existing] = await tx
      .select({ id: auditLogs.id })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.workspaceId, input.workspaceId),
          eq(auditLogs.actorUserId, input.userId),
          eq(auditLogs.action, ACCESS_REQUESTED),
        ),
      )
      .limit(1);
    if (existing) return "already-requested";

    await writeAudit(tx, {
      workspaceId: input.workspaceId,
      actorUserId: input.userId,
      action: ACCESS_REQUESTED,
      entityType: "workspace",
      entityId: input.workspaceId,
    });
    return "requested";
  });
}

/** Grant a role to a user who requested access. Never creates users or auto-promotes. */
export async function grantMember(
  ex: Executor,
  input: { workspaceId: string; actorUserId: string; targetUserId: string; role: Role },
): Promise<void> {
  await ex.transaction(async (tx) => {
    const [existing] = await tx
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, input.workspaceId), eq(workspaceMembers.userId, input.targetUserId)))
      .limit(1);
    if (existing) throw new MemberError("ALREADY_MEMBER", 409, "This user already has access. Change their role instead.");

    const pending = await listPendingRequests(tx, input.workspaceId);
    if (!pending.some((p) => p.userId === input.targetUserId)) {
      throw new MemberError("NOT_PENDING", 404, "No pending access request from this user.");
    }

    await tx.insert(workspaceMembers).values({
      workspaceId: input.workspaceId,
      userId: input.targetUserId,
      role: input.role,
      status: "ACTIVE",
    });
    await writeAudit(tx, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      action: "MEMBER_GRANTED",
      entityType: "workspace_member",
      entityId: input.targetUserId,
      context: { role: input.role },
    });
  });
}

type RoleStatus = { role: string; status: string };

/** True when applying `next` to a currently-active admin would leave zero active admins. */
export function wouldRemoveLastAdmin(current: RoleStatus, next: RoleStatus, activeAdminCount: number): boolean {
  const isActiveAdmin = (m: RoleStatus) => m.role === "ADMIN" && m.status === "ACTIVE";
  return isActiveAdmin(current) && !isActiveAdmin(next) && activeAdminCount <= 1;
}

export async function updateMember(
  ex: Executor,
  input: { workspaceId: string; actorUserId: string; targetUserId: string; role?: Role; status?: MemberStatus },
): Promise<void> {
  if (input.role === undefined && input.status === undefined) {
    throw new MemberError("INVALID_CHANGE", 422, "Provide a role or status to change.");
  }
  await ex.transaction(async (tx) => {
    // Lock every ACTIVE admin row so concurrent demotions serialize and the
    // last-admin check below sees committed state.
    const admins = await tx
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, input.workspaceId),
          eq(workspaceMembers.role, "ADMIN"),
          eq(workspaceMembers.status, "ACTIVE"),
        ),
      )
      .for("update");

    const [current] = await tx
      .select({ role: workspaceMembers.role, status: workspaceMembers.status })
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, input.workspaceId), eq(workspaceMembers.userId, input.targetUserId)))
      .for("update");
    if (!current) throw new MemberError("NOT_FOUND", 404, "Member not found in this workspace.");

    const next = { role: input.role ?? current.role, status: input.status ?? current.status };
    if (next.role === current.role && next.status === current.status) return; // no-op

    if (wouldRemoveLastAdmin(current, next, admins.length)) {
      throw new MemberError("LAST_ADMIN", 409, "You cannot demote or suspend the last active admin.");
    }

    await tx
      .update(workspaceMembers)
      .set({ role: next.role, status: next.status, updatedAt: new Date() })
      .where(and(eq(workspaceMembers.workspaceId, input.workspaceId), eq(workspaceMembers.userId, input.targetUserId)));

    const action =
      next.status !== current.status
        ? next.status === "SUSPENDED"
          ? "MEMBER_SUSPENDED"
          : "MEMBER_REACTIVATED"
        : "MEMBER_ROLE_CHANGED";
    await writeAudit(tx, {
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      action,
      entityType: "workspace_member",
      entityId: input.targetUserId,
      context: { from: { role: current.role, status: current.status }, to: next },
    });
  });
}
