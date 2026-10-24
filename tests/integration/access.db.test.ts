import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { resolveAccess } from "@/server/authorization/access";
import { users, workspaceMembers, workspaces } from "@/server/db/schema";
import { closeTestPool, hasDatabase, readOnlyDb, withRollback } from "../helpers/db";

/**
 * Real-database tests of the membership lookup behind every guard.
 * - The first test only READS the real seeded workspace.
 * - The rest insert fixtures inside a transaction that is always rolled back.
 */
describe.skipIf(!hasDatabase)("resolveAccess (real database)", () => {
  afterAll(closeTestPool);

  it("resolves the seeded workspace admin from the real tables (read-only)", async () => {
    const db = readOnlyDb();
    const real = await db.execute(sql`
      select u.clerk_user_id, m.workspace_id
        from workspace_members m join users u on u.id = m.user_id
       where m.role = 'ADMIN' and m.status = 'ACTIVE'
       order by m.created_at limit 1`);
    const row = real.rows[0] as { clerk_user_id: string; workspace_id: string } | undefined;
    expect(row, "expected the dev database to have at least one ACTIVE admin").toBeDefined();

    const state = await resolveAccess(db, row!.clerk_user_id);
    expect(state.status).toBe("ok");
    if (state.status === "ok") {
      expect(state.access.role).toBe("ADMIN");
      expect(state.access.workspaceId).toBe(row!.workspace_id);
      expect(state.access.workspaceName.length).toBeGreaterThan(0);
      expect(state.access.workspaceTimezone.length).toBeGreaterThan(0);
    }
  });

  it("treats an unknown Clerk identity as no membership, without creating anything", async () => {
    const db = readOnlyDb();
    const before = await db.execute(sql`select count(*)::int as n from users`);
    const state = await resolveAccess(db, "user_does_not_exist_" + Date.now());
    const after = await db.execute(sql`select count(*)::int as n from users`);
    expect(state).toMatchObject({ status: "no-membership", userId: null });
    expect((after.rows[0] as { n: number }).n).toBe((before.rows[0] as { n: number }).n);
  });

  it("returns each membership state correctly (fixtures rolled back)", async () => {
    await withRollback(async (ex) => {
      const [ws] = await ex.insert(workspaces).values({ name: "T", slug: `t-${Date.now()}` }).returning({ id: workspaces.id });
      const mk = async (clerk: string) =>
        (await ex.insert(users).values({ clerkUserId: clerk }).returning({ id: users.id }))[0].id;
      const [staff, user, suspended, none] = [await mk("c_staff"), await mk("c_user"), await mk("c_susp"), await mk("c_none")];
      await ex.insert(workspaceMembers).values([
        { workspaceId: ws.id, userId: staff, role: "STAFF", status: "ACTIVE" },
        { workspaceId: ws.id, userId: user, role: "USER", status: "ACTIVE" },
        { workspaceId: ws.id, userId: suspended, role: "ADMIN", status: "SUSPENDED" },
      ]);

      const staffState = await resolveAccess(ex, "c_staff");
      expect(staffState.status === "ok" && staffState.access.role).toBe("STAFF");
      expect(staffState.status === "ok" && staffState.access.workspaceId).toBe(ws.id);

      const userState = await resolveAccess(ex, "c_user");
      expect(userState.status === "ok" && userState.access.role).toBe("USER");

      // A suspended ADMIN must get no access at all.
      expect(await resolveAccess(ex, "c_susp")).toMatchObject({ status: "suspended", userId: suspended });

      // Signed in (users row exists) but never granted: no access, never auto-promoted.
      expect(await resolveAccess(ex, "c_none")).toMatchObject({ status: "no-membership", userId: none });
    });
  });

  it("rejects an invalid role value at the database level (fail closed)", async () => {
    await expect(
      withRollback(async (ex) => {
        const [ws] = await ex.insert(workspaces).values({ name: "T2", slug: `t2-${Date.now()}` }).returning({ id: workspaces.id });
        const [u] = await ex.insert(users).values({ clerkUserId: "c_bad" }).returning({ id: users.id });
        await ex.insert(workspaceMembers).values({ workspaceId: ws.id, userId: u.id, role: "SUPERADMIN", status: "ACTIVE" });
      }),
    ).rejects.toThrow();
  });
});
