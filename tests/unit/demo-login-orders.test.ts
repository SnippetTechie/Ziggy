import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../src/server/errors";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/db/schema", () => ({ locations: {}, members: {}, users: {} }));
const requireRole = vi.fn();
vi.mock("@/server/authorization", () => ({ requireRole }));
const placeOrder = vi.fn(), listOrders = vi.fn(), transitionOrder = vi.fn();
vi.mock("@/modules/orders/service", async importOriginal => ({ ...(await importOriginal<typeof import("../../src/modules/orders/service")>().catch(() => ({}))), placeOrder, listOrders, transitionOrder }));

const env = { ...process.env };
beforeEach(() => { Object.assign(process.env, { NODE_ENV: "development", ZIGGY_DEV_LOGIN: "1", ZIGGY_DEV_SESSION_SECRET: "unit-test-secret-0123456789" }); requireRole.mockReset(); });
afterEach(() => { process.env = { ...env }; });

describe("demo sign-in", () => {
  it("accepts only the two demo accounts", async () => {
    const { checkDemoLogin } = await import("../../src/server/auth/dev-login");
    expect(checkDemoLogin("demo-user", "ziggy-demo-user")).toBe("user");
    expect(checkDemoLogin("demo-admin", "ziggy-demo-admin")).toBe("admin");
    expect(checkDemoLogin("demo-admin", "ziggy-demo-user")).toBeNull();
    expect(checkDemoLogin("admin", "")).toBeNull();
  });
  it("signs tokens that expire and cannot be tampered with or upgraded", async () => {
    const { makeToken, readToken } = await import("../../src/server/auth/dev-login");
    const now = Date.now();
    const token = makeToken("user", now);
    expect(readToken(token, now + 1000)).toBe("user");
    expect(readToken(token, now + 13 * 3600 * 1000)).toBeNull(); // expired
    const [, expires, signature] = token.split(".");
    expect(readToken(`admin.${expires}.${signature}`, now)).toBeNull(); // role swap
    expect(readToken(`user.${expires}.${signature.slice(1)}x`, now)).toBeNull();
    expect(readToken("garbage", now)).toBeNull();
  });
  it("is off in production, without the flag, or without a strong secret", async () => {
    const { devLoginEnabled } = await import("../../src/server/auth/dev-login");
    expect(devLoginEnabled()).toBe(true);
    process.env.NODE_ENV = "production"; expect(devLoginEnabled()).toBe(false);
    process.env.NODE_ENV = "development"; process.env.ZIGGY_DEV_LOGIN = "0"; expect(devLoginEnabled()).toBe(false);
    process.env.ZIGGY_DEV_LOGIN = "1"; process.env.ZIGGY_DEV_SESSION_SECRET = "short"; expect(devLoginEnabled()).toBe(false);
  });
});

describe("customer order input", () => {
  it("accepts whole or decimal positive quantities and rejects bad requests", async () => {
    const { placeInput } = await import("../../src/modules/orders/service");
    const id = "9d1c9d2e-0000-4000-8000-000000000001";
    expect(placeInput.parse({ items: [{ productId: id, quantity: "2" }] }).note).toBe("");
    expect(() => placeInput.parse({ items: [] })).toThrow();
    expect(() => placeInput.parse({ items: [{ productId: id, quantity: "0" }] })).toThrow();
    expect(() => placeInput.parse({ items: [{ productId: id, quantity: "-1" }] })).toThrow();
    expect(() => placeInput.parse({ items: [{ productId: id, quantity: "1", price: "5.00" }] })).toThrow(); // no prices on stock requests
    expect(() => placeInput.parse({ items: [{ productId: "x", quantity: "1" }] })).toThrow();
  });
});

describe("order endpoints", () => {
  const post = (path: string, headers: Record<string, string> = {}, body: unknown = {}) => new Request(`http://localhost/api/v1/${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  const id = "9d1c9d2e-0000-4000-8000-000000000001";
  it("fulfilment/confirm/cancel require ADMIN and reject unknown actions", async () => {
    const { POST } = await import("../../src/app/api/v1/orders/[orderId]/[action]/route");
    requireRole.mockResolvedValue({ userId: "u", workspaceId: "w", locationId: "l", role: "ADMIN" });
    transitionOrder.mockResolvedValue({ status: "FULFILLED" });
    expect((await POST(post(`orders/${id}/fulfil`), { params: Promise.resolve({ orderId: id, action: "fulfil" }) })).status).toBe(200);
    expect(requireRole).toHaveBeenCalledWith("ADMIN");
    expect(transitionOrder).toHaveBeenCalledWith(expect.anything(), id, "fulfil");
    expect((await POST(post(`orders/${id}/delete`), { params: Promise.resolve({ orderId: id, action: "delete" }) })).status).toBe(422);
    requireRole.mockRejectedValueOnce(new AppError("FORBIDDEN", "No access.", 403));
    expect((await POST(post(`orders/${id}/fulfil`), { params: Promise.resolve({ orderId: id, action: "fulfil" }) })).status).toBe(403);
  });
  it("placing a request needs an Idempotency-Key and passes it through", async () => {
    const { POST } = await import("../../src/app/api/v1/orders/route");
    requireRole.mockResolvedValue({ userId: "u", workspaceId: "w", locationId: "l", role: "USER" });
    placeOrder.mockResolvedValue({ id: "o1" });
    const body = { items: [{ productId: id, quantity: "2" }] };
    expect((await POST(post("orders", {}, body))).status).toBe(422);
    expect((await POST(post("orders", { "idempotency-key": "request-key-1234" }, body))).status).toBe(200);
    expect(placeOrder).toHaveBeenCalledWith(expect.objectContaining({ role: "USER" }), body, "request-key-1234");
  });
  it("lists own requests by default and validates the query", async () => {
    const { GET } = await import("../../src/app/api/v1/orders/route");
    requireRole.mockResolvedValue({ userId: "u", workspaceId: "w", locationId: "l", role: "USER" });
    listOrders.mockResolvedValue([]);
    expect((await GET(new Request("http://localhost/api/v1/orders"))).status).toBe(200);
    expect(listOrders).toHaveBeenCalledWith(expect.anything(), "mine", undefined);
    expect((await GET(new Request("http://localhost/api/v1/orders?scope=everyone"))).status).toBe(422);
    expect((await GET(new Request("http://localhost/api/v1/orders?workspaceId=x"))).status).toBe(422);
  });
});
