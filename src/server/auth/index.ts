import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq, asc, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "../db";
import { users, members, locations } from "../db/schema";
import type { Access, Role } from "../../modules/access/policy";
import { ensure } from "../errors";

/**
 * Local-development "skip login" mode. Set ZIGGY_DEV_AUTH_ROLE=ADMIN|STAFF|USER in .env.local
 * to act as the workspace's first ACTIVE member (Admin preferred) with that role, without Clerk.
 * Ignored when NODE_ENV is production, so it cannot be switched on in a deployment.
 */
export function devAuthRole(): Role | null {
  const role = process.env.ZIGGY_DEV_AUTH_ROLE;
  return process.env.NODE_ENV !== "production" && (role === "USER" || role === "STAFF" || role === "ADMIN") ? role : null;
}
const devMember = cache(async () => {
  const [member] = await db.select({ user: users, workspaceId: members.workspaceId, locationId: locations.id }).from(members).innerJoin(users, eq(users.id, members.userId)).innerJoin(locations, eq(locations.workspaceId, members.workspaceId)).where(eq(members.status, "ACTIVE")).orderBy(sql`case when ${members.role} = 'ADMIN' then 0 else 1 end`, asc(locations.id)).limit(1);
  ensure(member, "NO_DEV_MEMBER", "Dev auth is on but the database has no active member to act as.", 500);
  return member;
});

export const getIdentity = cache(async () => {
  if (devAuthRole()) return (await devMember()).user;
  const session = await auth();
  if (!session.userId) return null;
  const [existing] = await db.select().from(users).where(eq(users.clerkUserId, session.userId)).limit(1);
  if (existing) return existing;
  const clerkUser = await currentUser();
  ensure(clerkUser, "UNAUTHENTICATED", "Please sign in.", 401);
  const email = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId && e.verification?.status === "verified");
  ensure(email, "EMAIL_REQUIRED", "Verify your email address before requesting access.", 403);
  const [created] = await db.insert(users).values({ clerkUserId: session.userId, email: email.emailAddress.toLowerCase(), displayName: clerkUser.fullName || email.emailAddress }).onConflictDoUpdate({ target: users.clerkUserId, set: { email: email.emailAddress.toLowerCase() } }).returning();
  // Identity creation intentionally grants no workspace membership.
  return created;
});
export const getAccess = cache(async (): Promise<Access | null> => {
  const dev = devAuthRole();
  if (dev) { const member = await devMember(); return { userId: member.user.id, workspaceId: member.workspaceId, locationId: member.locationId, role: dev }; }
  const identity = await getIdentity();
  if (!identity) return null;
  const [member] = await db.select({ workspaceId: members.workspaceId, role: members.role, locationId: locations.id }).from(members).innerJoin(locations, eq(locations.workspaceId, members.workspaceId)).where(and(eq(members.userId, identity.id), eq(members.status, "ACTIVE"))).orderBy(asc(locations.id)).limit(1);
  return member ? { userId: identity.id, ...member } : null;
});
