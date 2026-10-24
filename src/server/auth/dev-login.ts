import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "../db";
import { locations, members, users } from "../db/schema";
import { ensure } from "../errors";
import type { Role } from "../../modules/access/policy";

/**
 * Local presentation sign-in with two demo accounts, used instead of Clerk.
 * Fail-closed: requires NODE_ENV != production AND ZIGGY_DEV_LOGIN=1 AND a
 * ZIGGY_DEV_SESSION_SECRET of 16+ characters. Clerk is untouched and stays the
 * only sign-in in production. The demo passwords below are public demo values,
 * not real credentials.
 */
export const DEV_COOKIE = "ziggy_dev_session";
export type DemoKey = "user" | "admin";
export const demoAccounts: Record<DemoKey, { username: string; password: string; email: string; name: string }> = {
  user: { username: "demo-user", password: "ziggy-demo-user", email: "demo-user@ziggy.invalid", name: "Demo User" },
  admin: { username: "demo-admin", password: "ziggy-demo-admin", email: "", name: "Demo Admin" },
};
const TTL_MS = 12 * 60 * 60 * 1000;

export function devLoginEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.ZIGGY_DEV_LOGIN === "1" && (process.env.ZIGGY_DEV_SESSION_SECRET?.length ?? 0) >= 16;
}
const sign = (value: string) => createHmac("sha256", process.env.ZIGGY_DEV_SESSION_SECRET!).update(value).digest("base64url");
const same = (a: string, b: string) => {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

export function makeToken(key: DemoKey, now = Date.now()) {
  const payload = `${key}.${now + TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}
export function readToken(raw: string, now = Date.now()): DemoKey | null {
  const parts = raw.split(".");
  const [key, expires, signature] = parts;
  if (parts.length !== 3 || (key !== "user" && key !== "admin") || !expires || !signature || !Number.isFinite(Number(expires)) || Number(expires) <= now || !same(signature, sign(`${key}.${expires}`))) return null;
  return key;
}
export function checkDemoLogin(username: string, password: string): DemoKey | null {
  for (const key of ["user", "admin"] as const) {
    const account = demoAccounts[key];
    if (same(username, account.username) && same(password, account.password)) return key;
  }
  return null;
}

export async function devSessionKey(): Promise<DemoKey | null> {
  await connection(); // request-time only: token expiry reads the clock (cacheComponents forbids that while prerendering)
  const raw = (await cookies()).get(DEV_COOKIE)?.value;
  return raw ? readToken(raw) : null;
}

/** The acting database identity for a demo account. The role always comes from the real membership row. */
export const resolveDevMember = cache(async (key: DemoKey) => {
  const [admin] = await db.select({ user: users, workspaceId: members.workspaceId, locationId: locations.id }).from(members).innerJoin(users, eq(users.id, members.userId)).innerJoin(locations, eq(locations.workspaceId, members.workspaceId))
    .where(sql`${members.status} = 'ACTIVE' and ${members.role} = 'ADMIN'`).orderBy(asc(locations.id)).limit(1);
  ensure(admin, "NO_DEV_MEMBER", "Demo sign-in needs an existing active Admin member in the database.", 500);
  if (key === "admin") return { user: admin.user, workspaceId: admin.workspaceId, locationId: admin.locationId, role: "ADMIN" as Role };
  const account = demoAccounts.user;
  // The live users.clerk_user_id column is NOT NULL, so the demo user gets a clearly non-Clerk placeholder id.
  await db.insert(users).values({ clerkUserId: "demo-local-user", email: account.email, displayName: account.name }).onConflictDoNothing();
  const [user] = await db.select().from(users).where(eq(users.email, account.email));
  ensure(user?.clerkUserId === "demo-local-user", "DEMO_USER_INVALID", "The dedicated demo identity is not available.", 403);
  await db.insert(members).values({ workspaceId: admin.workspaceId, userId: user.id, role: "USER", status: "ACTIVE" }).onConflictDoNothing();
  const [member] = await db.select().from(members).where(sql`${members.workspaceId} = ${admin.workspaceId} and ${members.userId} = ${user.id}`);
  ensure(member?.status === "ACTIVE", "DEMO_USER_SUSPENDED", "The demo user is not active.", 403);
  ensure(member.role === "USER", "DEMO_USER_INVALID", "The demo account must have the User role.", 403);
  return { user, workspaceId: admin.workspaceId, locationId: admin.locationId, role: member.role };
});
