import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccessState } from "@/server/authorization/access";
import type { Role } from "@/server/authorization/roles";

/**
 * Authorization matrix for the real route handlers, with the session/membership
 * source mocked. The database is replaced by an empty object: a rejected
 * request must be refused BEFORE touching it (if it did, the handler would
 * throw and return 500, not 401/403).
 *
 * This proves the guard wiring on every protected route. The database-backed
 * membership lookup itself is covered in tests/integration/access.db.test.ts.
 */
const holder = vi.hoisted(() => ({ state: { status: "unauthenticated" } as unknown }));

vi.mock("@/server/authorization/session", () => ({
  getAccessState: async () => holder.state,
}));
vi.mock("@/server/db", () => ({ db: {} }));

const access = (role: Role): AccessState => ({
  status: "ok",
  access: {
    clerkUserId: "clerk_x",
    userId: "00000000-0000-4000-8000-000000000001",
    workspaceId: "00000000-0000-4000-8000-0000000000aa",
    workspaceName: "Test",
    workspaceTimezone: "Asia/Kolkata",
    workspaceSettings: {},
    role,
  },
});

type RouteCase = {
  name: string;
  min: Role;
  call: () => Promise<Response>;
};

const url = (path: string) => `http://localhost/api/v1${path}`;
const uid = "00000000-0000-4000-8000-000000000002";

const routes: RouteCase[] = [
  {
    name: "GET /dashboard/summary",
    min: "STAFF",
    call: async () => (await import("@/app/api/v1/dashboard/summary/route")).GET(new Request(url("/dashboard/summary"))),
  },
  {
    name: "GET /alerts/low-stock",
    min: "STAFF",
    call: async () => (await import("@/app/api/v1/alerts/low-stock/route")).GET(new Request(url("/alerts/low-stock"))),
  },
  {
    name: "GET /reports/stock-summary",
    min: "ADMIN",
    call: async () => (await import("@/app/api/v1/reports/stock-summary/route")).GET(new Request(url("/reports/stock-summary"))),
  },
  {
    name: "GET /reports/stock-summary?format=csv",
    min: "ADMIN",
    call: async () =>
      (await import("@/app/api/v1/reports/stock-summary/route")).GET(new Request(url("/reports/stock-summary?format=csv"))),
  },
  {
    name: "GET /reports/movements",
    min: "ADMIN",
    call: async () => (await import("@/app/api/v1/reports/movements/route")).GET(new Request(url("/reports/movements"))),
  },
  {
    name: "GET /members",
    min: "ADMIN",
    call: async () => (await import("@/app/api/v1/members/route")).GET(new Request(url("/members"))),
  },
  {
    name: "POST /members",
    min: "ADMIN",
    call: async () =>
      (await import("@/app/api/v1/members/route")).POST(
        new Request(url("/members"), { method: "POST", body: JSON.stringify({ userId: uid, role: "ADMIN" }) }),
      ),
  },
  {
    name: "GET /members/pending",
    min: "ADMIN",
    call: async () => (await import("@/app/api/v1/members/pending/route")).GET(new Request(url("/members/pending"))),
  },
  {
    name: "PATCH /members/{userId}",
    min: "ADMIN",
    call: async () =>
      (await import("@/app/api/v1/members/[userId]/route")).PATCH(
        new Request(url(`/members/${uid}`), { method: "PATCH", body: JSON.stringify({ role: "USER" }) }),
        { params: Promise.resolve({ userId: uid }) } as never,
      ),
  },
];

const RANK: Record<Role, number> = { USER: 1, STAFF: 2, ADMIN: 3 };

async function errorCode(res: Response): Promise<string | undefined> {
  return ((await res.json()) as { error?: { code?: string } }).error?.code;
}

describe.each(routes)("$name", ({ min, call }) => {
  beforeEach(() => {
    holder.state = { status: "unauthenticated" };
  });

  it("rejects unauthenticated callers with 401 and the error envelope", async () => {
    holder.state = { status: "unauthenticated" };
    const res = await call();
    expect(res.status).toBe(401);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    const body = (await res.json()) as { error: { code: string; message: string; requestId: string; details: object } };
    expect(body.error.code).toBe("UNAUTHENTICATED");
    expect(body.error.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("rejects a signed-in user with no membership (403, no data)", async () => {
    holder.state = { status: "no-membership", clerkUserId: "clerk_x", userId: null };
    const res = await call();
    expect(res.status).toBe(403);
    expect(await errorCode(res)).toBe("ACCESS_REQUIRED");
  });

  it("rejects a suspended member (403)", async () => {
    holder.state = { status: "suspended", clerkUserId: "clerk_x", userId: uid };
    const res = await call();
    expect(res.status).toBe(403);
    expect(await errorCode(res)).toBe("ACCESS_REQUIRED");
  });

  it.each((["USER", "STAFF", "ADMIN"] as Role[]).filter((r) => RANK[r] < RANK[min]))(
    "rejects an ACTIVE %s member with 403 FORBIDDEN",
    async (role) => {
      holder.state = access(role);
      const res = await call();
      expect(res.status).toBe(403);
      expect(await errorCode(res)).toBe("FORBIDDEN");
    },
  );
});

describe("role boundaries", () => {
  it("the matrix covers USER-vs-STAFF endpoints and STAFF-vs-ADMIN endpoints", () => {
    expect(routes.some((r) => r.min === "STAFF")).toBe(true);
    expect(routes.some((r) => r.min === "ADMIN")).toBe(true);
  });
});

describe("error envelope hygiene", () => {
  it("never leaks internal error text from a failing handler", async () => {
    const { createRoleGuard } = await import("@/server/http/api");
    const withRole = createRoleGuard(async () => access("ADMIN"));
    const handler = withRole("ADMIN", async () => {
      throw new Error('select * from users where password = "hunter2" at /srv/app/secret.ts:42');
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handler(new Request("http://localhost/x"));
    spy.mockRestore();
    expect(res.status).toBe(500);
    const text = JSON.stringify(await res.json());
    expect(text).toContain("INTERNAL_ERROR");
    expect(text).not.toMatch(/hunter2|select|secret\.ts/i);
  });
});
