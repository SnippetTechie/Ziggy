import { and, eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import {
  MemberError,
  grantMember,
  listMembers,
  listPendingRequests,
  requestAccess,
  updateMember,
} from "@/modules/access/members";
import { auditLogs, users, workspaceMembers, workspaces } from "@/server/db/schema";
import type { Executor } from "@/server/db/types";
import { closeTestPool, hasDatabase, withRollback } from "../helpers/db";

async function seed(ex: Executor) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const mkWs = async (n: string) =>
    (await ex.insert(workspaces).values({ name: n, slug: `${n}-${stamp}` }).returning({ id: workspaces.id }))[0].id;
  const mkUser = async (c: string) =>
    (await ex.insert(users).values({ clerkUserId: `${c}-${stamp}`, email: `${c}@example.test` }).returning({ id: users.id }))[0].id;
  return { mkWs, mkUser };
}

describe.skipIf(!hasDatabase)("member management (real database, rolled back)", () => {
  afterAll(closeTestPool);

  it("never lets the last active admin be demoted or suspended", async () => {
    await withRollback(async (ex) => {
      const { mkWs, mkUser } = await seed(ex);
      const ws = await mkWs("w");
      const [a, b] = [await mkUser("a"), await mkUser("b")];
      await ex.insert(workspaceMembers).values([
        { workspaceId: ws, userId: a, role: "ADMIN", status: "ACTIVE" },
        { workspaceId: ws, userId: b, role: "STAFF", status: "ACTIVE" },
      ]);

      await expect(updateMember(ex, { workspaceId: ws, actorUserId: a, targetUserId: a, role: "STAFF" })).rejects.toMatchObject({
        code: "LAST_ADMIN",
        status: 409,
      });
      await expect(updateMember(ex, { workspaceId: ws, actorUserId: a, targetUserId: a, status: "SUSPENDED" })).rejects.toBeInstanceOf(MemberError);

      // Still an active admin after both rejected attempts.
      const [row] = await ex.select().from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, ws), eq(workspaceMembers.userId, a)));
      expect(row).toMatchObject({ role: "ADMIN", status: "ACTIVE" });

      // Promote a second admin: now demoting the first is allowed, demoting the second is not.
      await updateMember(ex, { workspaceId: ws, actorUserId: a, targetUserId: b, role: "ADMIN" });
      await updateMember(ex, { workspaceId: ws, actorUserId: a, targetUserId: a, role: "STAFF" });
      await expect(updateMember(ex, { workspaceId: ws, actorUserId: b, targetUserId: b, status: "SUSPENDED" })).rejects.toMatchObject({ code: "LAST_ADMIN" });

      const members = await listMembers(ex, ws);
      expect(members.find((m) => m.userId === a)?.role).toBe("STAFF");
      expect(members.find((m) => m.userId === b)).toMatchObject({ role: "ADMIN", status: "ACTIVE" });
    });
  });

  it("suspends and reactivates members, recording an audit entry for each change", async () => {
    await withRollback(async (ex) => {
      const { mkWs, mkUser } = await seed(ex);
      const ws = await mkWs("w");
      const [admin, staff] = [await mkUser("adm"), await mkUser("stf")];
      await ex.insert(workspaceMembers).values([
        { workspaceId: ws, userId: admin, role: "ADMIN", status: "ACTIVE" },
        { workspaceId: ws, userId: staff, role: "STAFF", status: "ACTIVE" },
      ]);
      await updateMember(ex, { workspaceId: ws, actorUserId: admin, targetUserId: staff, status: "SUSPENDED" });
      await updateMember(ex, { workspaceId: ws, actorUserId: admin, targetUserId: staff, status: "ACTIVE" });
      await updateMember(ex, { workspaceId: ws, actorUserId: admin, targetUserId: staff, role: "USER" });
      const actions = (await ex.select({ action: auditLogs.action }).from(auditLogs).where(eq(auditLogs.workspaceId, ws)).orderBy(auditLogs.createdAt)).map((r) => r.action);
      expect(actions).toEqual(["MEMBER_SUSPENDED", "MEMBER_REACTIVATED", "MEMBER_ROLE_CHANGED"]);
    });
  });

  it("rejects changes to someone who is not a member of the caller's workspace", async () => {
    await withRollback(async (ex) => {
      const { mkWs, mkUser } = await seed(ex);
      const [w1, w2] = [await mkWs("w1"), await mkWs("w2")];
      const [admin1, outsider] = [await mkUser("a1"), await mkUser("o")];
      await ex.insert(workspaceMembers).values([
        { workspaceId: w1, userId: admin1, role: "ADMIN", status: "ACTIVE" },
        { workspaceId: w2, userId: outsider, role: "STAFF", status: "ACTIVE" },
      ]);
      // admin1 (workspace 1) tries to modify a member of workspace 2 by UUID.
      await expect(updateMember(ex, { workspaceId: w1, actorUserId: admin1, targetUserId: outsider, role: "ADMIN" })).rejects.toMatchObject({ code: "NOT_FOUND" });
      const [untouched] = await ex.select().from(workspaceMembers).where(eq(workspaceMembers.userId, outsider));
      expect(untouched.role).toBe("STAFF");
    });
  });

  it("scopes access requests to the intended workspace and never lists unrelated users", async () => {
    await withRollback(async (ex) => {
      const { mkWs, mkUser } = await seed(ex);
      const [w1, w2] = [await mkWs("w1"), await mkWs("w2")];
      const [requester, bystander, otherTenantRequester, adminUser] = [await mkUser("req"), await mkUser("by"), await mkUser("oth"), await mkUser("adm")];
      await ex.insert(workspaceMembers).values({ workspaceId: w1, userId: adminUser, role: "ADMIN", status: "ACTIVE" });

      expect(await requestAccess(ex, { userId: requester, workspaceId: w1 })).toBe("requested");
      expect(await requestAccess(ex, { userId: requester, workspaceId: w1 })).toBe("already-requested"); // idempotent
      expect(await requestAccess(ex, { userId: otherTenantRequester, workspaceId: w2 })).toBe("requested");
      expect(await requestAccess(ex, { userId: adminUser, workspaceId: w1 })).toBe("already-member");

      // Workspace 1 sees only its own requester — not the bystander (never asked) or workspace 2's requester.
      const pending = await listPendingRequests(ex, w1);
      expect(pending.map((p) => p.userId)).toEqual([requester]);

      // Cannot grant someone who never requested access (no global user enumeration).
      await expect(grantMember(ex, { workspaceId: w1, actorUserId: adminUser, targetUserId: bystander, role: "STAFF" })).rejects.toMatchObject({ code: "NOT_PENDING" });
      // Cannot grant another tenant's requester into this workspace.
      await expect(grantMember(ex, { workspaceId: w1, actorUserId: adminUser, targetUserId: otherTenantRequester, role: "STAFF" })).rejects.toMatchObject({ code: "NOT_PENDING" });

      // Granting the real requester works, creates ACTIVE membership with the chosen role, and clears the request.
      await grantMember(ex, { workspaceId: w1, actorUserId: adminUser, targetUserId: requester, role: "STAFF" });
      const [m] = await ex.select().from(workspaceMembers).where(and(eq(workspaceMembers.workspaceId, w1), eq(workspaceMembers.userId, requester)));
      expect(m).toMatchObject({ role: "STAFF", status: "ACTIVE" });
      expect(await listPendingRequests(ex, w1)).toEqual([]);
      await expect(grantMember(ex, { workspaceId: w1, actorUserId: adminUser, targetUserId: requester, role: "ADMIN" })).rejects.toMatchObject({ code: "ALREADY_MEMBER" });

      // The other tenant's request is untouched.
      expect((await listPendingRequests(ex, w2)).map((p) => p.userId)).toEqual([otherTenantRequester]);
    });
  });

  it("rolled-back fixtures leave no trace in the shared database", async () => {
    const before = await withRollback(async (ex) => (await ex.execute(sql`select count(*)::int as n from workspaces`)).rows[0] as { n: number });
    expect(before.n).toBeGreaterThanOrEqual(1);
    // Insert, roll back, then confirm the count is unchanged from a fresh query.
    await withRollback(async (ex) => {
      await ex.insert(workspaces).values({ name: "ghost", slug: `ghost-${Date.now()}` });
    });
    const after = await withRollback(async (ex) => (await ex.execute(sql`select count(*)::int as n from workspaces`)).rows[0] as { n: number });
    expect(after.n).toBe(before.n);
  });
});
