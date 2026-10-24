import "server-only";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { resolveAccess, type Access, type AccessState } from "./access";
import { forbiddenRedirectPath, roleAtLeast, type Role } from "./roles";

/**
 * Current request's access state. Reads the Clerk session (a request-time API),
 * so callers must run inside <Suspense> under cacheComponents. The result is
 * never cached or shared across requests.
 */
export async function getAccessState(): Promise<AccessState> {
  const { userId } = await auth();
  if (!userId) return { status: "unauthenticated" };
  return resolveAccess(db, userId);
}

/**
 * Page guard: require an ACTIVE member with at least `min` role. Call at the top
 * of every protected page — layouts do not re-run on client navigation, so a
 * layout-only check is not enough. Redirect targets are fixed server-side.
 */
export async function requirePageRole(min: Role): Promise<Access> {
  const state = await getAccessState();
  if (state.status === "unauthenticated") redirect("/sign-in");
  if (state.status !== "ok") redirect("/access-required");
  if (!roleAtLeast(state.access.role, min)) {
    redirect(forbiddenRedirectPath(state.access.role, min));
  }
  return state.access;
}
