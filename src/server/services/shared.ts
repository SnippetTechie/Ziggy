import { and, eq } from "drizzle-orm";
import type { Access, Role } from "../../modules/access/policy";
import { canAccess } from "../../modules/access/policy";
import { auditLogs, members } from "../db/schema";
import type { Transaction } from "../db";
import { ensure } from "../errors";
export async function checkActor(tx: Transaction, access: Access, min: Role) {
  const [member] = await tx.select().from(members).where(and(eq(members.workspaceId, access.workspaceId), eq(members.userId, access.userId))).for("share");
  ensure(member?.status === "ACTIVE" && canAccess(member.role, min), "FORBIDDEN", "You do not have permission for this action.", 403);
}
export async function audit(tx: Transaction, access: Access, action: string, entityType: string, entityId: string, context: Record<string, unknown> = {}) {
  await tx.insert(auditLogs).values({ workspaceId: access.workspaceId, actorUserId: access.userId, action, entityType, entityId, context });
}
