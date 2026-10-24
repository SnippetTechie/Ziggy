import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq, asc } from "drizzle-orm";
import { cache } from "react";
import { db } from "../db";
import { users, members, locations } from "../db/schema";
import type { Access } from "../../modules/access/policy";
import { ensure } from "../errors";

export const getIdentity = cache(async () => {
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
  const identity = await getIdentity();
  if (!identity) return null;
  const [member] = await db.select({ workspaceId: members.workspaceId, role: members.role, locationId: locations.id }).from(members).innerJoin(locations, eq(locations.workspaceId, members.workspaceId)).where(and(eq(members.userId, identity.id), eq(members.status, "ACTIVE"))).orderBy(asc(locations.id)).limit(1);
  return member ? { userId: identity.id, ...member } : null;
});
