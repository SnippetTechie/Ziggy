import { and, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import type { Access } from "../../modules/access/policy";
import { mayChangeMember } from "../../modules/access/policy";
import { db } from "../db";
import { members, users, workspaces } from "../db/schema";
import { ensure } from "../errors";
import { memberInput, settingsInput } from "../validation";
import { audit, checkActor } from "./shared";
export async function setMember(access: Access, input: z.infer<typeof memberInput>) {
  return db.transaction(async tx => {
    await tx.select().from(workspaces).where(eq(workspaces.id, access.workspaceId)).for("no key update");
    await checkActor(tx, access, "ADMIN");
    const [user] = await tx.select().from(users).where(eq(users.id, input.userId));
    ensure(user, "NOT_FOUND", "This person must sign in before access can be granted.", 404);
    const [current] = await tx.select().from(members).where(and(eq(members.userId, input.userId), eq(members.workspaceId, access.workspaceId)));
    const [count] = await tx.select({ count: sql<number>`count(*)::int` }).from(members).where(and(eq(members.workspaceId, access.workspaceId), eq(members.role, "ADMIN"), eq(members.status, "ACTIVE")));
    ensure(!current || mayChangeMember(current.role, current.status, input.role, input.status, count.count), "LAST_ADMIN", "Keep at least one active Admin in this workspace.", 409);
    const [row] = await tx.insert(members).values({ workspaceId: access.workspaceId, ...input }).onConflictDoUpdate({ target: [members.workspaceId, members.userId], set: { role: input.role, status: input.status } }).returning();
    await audit(tx, access, "MEMBER_UPDATED", "member", input.userId, { role: input.role, status: input.status });
    return row;
  });
}
export async function updateSettings(access: Access, input: z.infer<typeof settingsInput>) {
  return db.transaction(async tx => {
    const [row] = await tx.select().from(workspaces).where(eq(workspaces.id, access.workspaceId)).for("no key update");
    await checkActor(tx, access, "ADMIN");
    const settings = { ...row.settings, ...input };
    await tx.update(workspaces).set({ settings }).where(eq(workspaces.id, access.workspaceId));
    await audit(tx, access, "SETTINGS_UPDATED", "workspace", access.workspaceId, input);
    return settings;
  });
}
