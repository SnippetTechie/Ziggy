export type Role = "USER" | "STAFF" | "ADMIN";
export type Access = { userId: string; workspaceId: string; locationId: string; role: Role };
const rank: Record<Role, number> = { USER: 0, STAFF: 1, ADMIN: 2 };
export const landings: Record<Role, string> = { USER: "/inventory", STAFF: "/dashboard", ADMIN: "/admin" };
export function canAccess(role: Role, minimum: Role) { return rank[role] >= rank[minimum]; }
export function destination(role: Role | null, requested: string | null | undefined) {
  if (!role) return { path: "/access-required", denied: false };
  const wanted: Role = requested === "admin" ? "ADMIN" : requested === "staff" ? "STAFF" : "USER";
  const allowed = canAccess(role, wanted);
  return { path: landings[allowed ? wanted : role], denied: !allowed };
}
export const viewCookie = "ziggy_view";
/** The role a member chose at sign-in, clamped so it can never exceed the real role. Presentation only. */
export function viewRole(role: Role, chosen: string | null | undefined): Role {
  const wanted = chosen === "ADMIN" || chosen === "STAFF" || chosen === "USER" ? chosen : role;
  return canAccess(role, wanted) ? wanted : role;
}
export function mayChangeMember(oldRole: Role, oldStatus: string, newRole: Role, newStatus: string, activeAdmins: number) {
  return !(oldRole === "ADMIN" && oldStatus === "ACTIVE" && (newRole !== "ADMIN" || newStatus !== "ACTIVE") && activeAdmins <= 1);
}
