import { beforeEach, describe, expect, it, vi } from "vitest";
const identity = vi.hoisted(() => ({ getIdentity: vi.fn(), getAccess: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../../src/server/auth", () => identity);
import { requireRole } from "../../src/server/authorization";
import { GET, POST, PATCH, DELETE } from "../../src/app/api/v1/[...path]/route";
beforeEach(() => { identity.getIdentity.mockResolvedValue({ id: crypto.randomUUID() }); identity.getAccess.mockResolvedValue(null); });
describe("actual server authorization and HTTP error envelopes", () => {
  it("rejects unsigned and no-membership accounts", async () => {
    identity.getIdentity.mockResolvedValueOnce(null);
    await expect(requireRole("USER")).rejects.toMatchObject({ code: "UNAUTHENTICATED", status: 401 });
    await expect(requireRole("USER")).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });
  it.each(["USER", "STAFF"] as const)("rejects %s from Admin operations", async role => {
    identity.getAccess.mockResolvedValue({ role, userId: crypto.randomUUID(), workspaceId: crypto.randomUUID(), locationId: crypto.randomUUID() });
    await expect(requireRole("ADMIN")).rejects.toMatchObject({ status: 403 });
  });
  it.each([
    [GET, "products"], [GET, "suppliers"], [GET, "reports/stock-summary"], [GET, "members"], [POST, "products"], [POST, "stock-in"], [POST, "stock-out"], [PATCH, `products/${crypto.randomUUID()}`], [DELETE, `products/${crypto.randomUUID()}`],
  ] as const)("denies no-membership requests without database data", async (handler, endpoint) => {
    const response = await handler(new Request(`http://localhost:3000/api/v1/${endpoint}`), { params: Promise.resolve({ path: endpoint.split("/") }) });
    expect(response.status).toBe(403);
    const result = await response.json();
    expect(result.data).toBeUndefined();
    expect(result.error.code).toBe("FORBIDDEN");
    expect(result.error.requestId).toBeTypeOf("string");
    expect(JSON.stringify(result)).not.toContain("postgresql");
  });
});
