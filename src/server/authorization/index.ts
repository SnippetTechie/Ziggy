import "server-only";
import { redirect } from "next/navigation";
import { getAccess, getIdentity } from "../auth";
import { canAccess, landings, type Role } from "../../modules/access/policy";
import { ensure } from "../errors";
export async function requireRole(min: Role) {
  const identity = await getIdentity();
  ensure(identity, "UNAUTHENTICATED", "Please sign in.", 401);
  const access = await getAccess();
  ensure(access && canAccess(access.role, min), "FORBIDDEN", "Your account does not have access to this action.", 403);
  return access;
}
export async function requirePageRole(min: Role) {
  const identity = await getIdentity();
  if (!identity) redirect("/sign-in");
  const access = await getAccess();
  if (!access) redirect("/access-required");
  if (!canAccess(access.role, min)) redirect(`${landings[access.role]}?notice=access-denied`);
  return access;
}
