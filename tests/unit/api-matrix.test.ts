import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Role } from "../../src/modules/access/policy";

/**
 * Authorization matrix for EVERY endpoint of the real API handler. The session
 * source is mocked; the database is an empty object, so a handler that tried to
 * read data before authorizing would crash (500) instead of returning 401/403.
 */
const auth = vi.hoisted(() => ({ getIdentity: vi.fn(), getAccess: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../../src/server/auth", () => auth);
vi.mock("../../src/server/db", () => ({ db: {}, pool: {} }));
import { GET, POST, PATCH, DELETE } from "../../src/app/api/v1/[...path]/route";

const id = "00000000-0000-4000-8000-000000000001";
type Case = [handler: typeof GET, method: string, path: string, min: Role, body?: unknown];
const cases: Case[] = [
  [GET, "GET", "me", "USER"],
  [GET, "GET", "products", "USER"],
  [GET, "GET", `products/${id}`, "USER"],
  [GET, "GET", "categories", "USER"],
  [GET, "GET", "suppliers", "STAFF"],
  [GET, "GET", "stock-movements", "STAFF"],
  [GET, "GET", "dashboard/summary", "STAFF"],
  [GET, "GET", "alerts/low-stock", "STAFF"],
  [POST, "POST", "stock-in", "STAFF", {}],
  [POST, "POST", "stock-out", "STAFF", {}],
  [POST, "POST", "products", "ADMIN", {}],
  [PATCH, "PATCH", `products/${id}`, "ADMIN", {}],
  [DELETE, "DELETE", `products/${id}`, "ADMIN"],
  [POST, "POST", `products/${id}/deactivate`, "ADMIN"],
  [POST, "POST", "categories", "ADMIN", {}],
  [PATCH, "PATCH", `categories/${id}`, "ADMIN", {}],
  [DELETE, "DELETE", `categories/${id}`, "ADMIN"],
  [POST, "POST", "suppliers", "ADMIN", {}],
  [PATCH, "PATCH", `suppliers/${id}`, "ADMIN", {}],
  [DELETE, "DELETE", `suppliers/${id}`, "ADMIN"],
  [GET, "GET", "reports/stock-summary", "ADMIN"],
  [GET, "GET", "reports/stock-summary?format=csv", "ADMIN"],
  [GET, "GET", "reports/movements", "ADMIN"],
  [GET, "GET", "reports/movements?format=csv", "ADMIN"],
  [GET, "GET", "members", "ADMIN"],
  [GET, "GET", "members/pending", "ADMIN"],
  [POST, "POST", "members", "ADMIN", {}],
  [PATCH, "PATCH", `members/${id}`, "ADMIN", {}],
  [GET, "GET", "settings", "ADMIN"],
  [PATCH, "PATCH", "settings", "ADMIN", {}],
  [GET, "GET", "audit-logs", "ADMIN"],
];
const rank: Record<Role, number> = { USER: 0, STAFF: 1, ADMIN: 2 };
const roles: Role[] = ["USER", "STAFF", "ADMIN"];
const call = ([handler, method, path, , body]: Case) =>
  handler(
    new Request(`http://localhost:3000/api/v1/${path}`, {
      method,
      headers: { "content-type": "application/json", "idempotency-key": "matrix-test-key" },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
    { params: Promise.resolve({ path: path.split("?")[0].split("/") }) },
  );
const access = (role: Role) => ({ role, userId: id, workspaceId: id, locationId: id });

beforeEach(() => {
  auth.getIdentity.mockReset();
  auth.getAccess.mockReset();
});

describe.each(cases)("%#", (...c) => {
  const [, method, path, min] = c;
  const label = `${method} /${path}`;
  it(`${label}: unauthenticated -> 401`, async () => {
    auth.getIdentity.mockResolvedValue(null);
    const res = await call(c);
    expect(res.status).toBe(401);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });
  it(`${label}: signed in but no ACTIVE membership (none or suspended) -> 403`, async () => {
    auth.getIdentity.mockResolvedValue({ id });
    auth.getAccess.mockResolvedValue(null); // getAccess only ever returns ACTIVE memberships
    const res = await call(c);
    expect(res.status).toBe(403);
    expect(JSON.stringify(await res.json())).not.toMatch(/postgres|select |stack/i);
  });
  it.each(roles.filter(r => rank[r] < rank[min]))(`${label}: ACTIVE %s (below ${min}) -> 403`, async role => {
    auth.getIdentity.mockResolvedValue({ id });
    auth.getAccess.mockResolvedValue(access(role));
    const res = await call(c);
    expect(res.status).toBe(403);
  });
});

describe("the matrix covers every role boundary", () => {
  it("includes USER-level, STAFF-level and ADMIN-level endpoints", () => {
    for (const min of roles) expect(cases.some(c => c[3] === min)).toBe(true);
  });
});
