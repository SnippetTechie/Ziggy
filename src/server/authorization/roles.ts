/**
 * Roles and dashboard destinations. Pure logic (no I/O) so it can be unit
 * tested and imported from both server and client code.
 *
 * Roles nest: ADMIN ⊇ STAFF ⊇ USER. The "Login as" selector only ever yields a
 * *requested* destination; the real landing route is derived from the role the
 * database grants (doc 05 §4.4).
 */
export const ROLES = ["USER", "STAFF", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

const RANK: Record<Role, number> = { USER: 1, STAFF: 2, ADMIN: 3 };

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function roleAtLeast(role: Role, min: Role): boolean {
  return RANK[role] >= RANK[min];
}

export const DESTINATIONS = ["user", "staff", "admin"] as const;
export type Destination = (typeof DESTINATIONS)[number];

/** Fixed server-side table. Redirect targets never come from the client. */
export const LANDING: Record<Destination, string> = {
  user: "/inventory",
  staff: "/dashboard",
  admin: "/admin",
};

const DESTINATION_MIN_ROLE: Record<Destination, Role> = {
  user: "USER",
  staff: "STAFF",
  admin: "ADMIN",
};

/** Notice codes shown after a redirect; the message is looked up, never echoed. */
export const NOTICES = {
  "staff-denied": "Your account does not have Staff access, so you were taken to your dashboard.",
  "admin-denied": "Your account does not have Admin access, so you were taken to your dashboard.",
} as const;
export type NoticeCode = keyof typeof NOTICES;

/**
 * Parse the untrusted `as` query value. Anything that is not exactly one of the
 * three allowed values (case-insensitive, trimmed) falls back to "user".
 */
export function parseDestination(raw: unknown): Destination {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return "user";
  const normalized = value.trim().toLowerCase();
  return (DESTINATIONS as readonly string[]).includes(normalized) ? (normalized as Destination) : "user";
}

/** The highest dashboard a role is allowed to land on. */
export function highestDestination(role: Role): Destination {
  if (role === "ADMIN") return "admin";
  if (role === "STAFF") return "staff";
  return "user";
}

export type LandingDecision = {
  destination: Destination;
  path: string;
  notice?: NoticeCode;
};

/**
 * Decide where a member lands. If the role covers the request, go there;
 * otherwise go to the highest dashboard the role permits, with a notice.
 * The role itself is never changed.
 */
export function resolveLanding(role: Role, requested: Destination): LandingDecision {
  if (roleAtLeast(role, DESTINATION_MIN_ROLE[requested])) {
    return { destination: requested, path: LANDING[requested] };
  }
  const destination = highestDestination(role);
  const notice: NoticeCode = requested === "admin" ? "admin-denied" : "staff-denied";
  return { destination, path: LANDING[destination], notice };
}

/** Landing path for a role with a "forbidden page" notice, used by page guards. */
export function forbiddenRedirectPath(role: Role, minRole: Role): string {
  const notice: NoticeCode = minRole === "ADMIN" ? "admin-denied" : "staff-denied";
  return `${LANDING[highestDestination(role)]}?notice=${notice}`;
}

export function isNoticeCode(value: unknown): value is NoticeCode {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(NOTICES, value);
}
