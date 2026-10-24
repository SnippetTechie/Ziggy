import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../src/server/errors";

vi.mock("server-only", () => ({}));
const requireRole = vi.fn();
vi.mock("@/server/authorization", () => ({ requireRole }));
// Importing the live catalog would load the database client; these routes must not need it.
vi.mock("@/server/shop/live-catalog", () => ({ liveCatalog: vi.fn() }));

const access = { userId: "u1", workspaceId: "w1", locationId: "l1", role: "USER" as const };
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://localhost/api/v1/catalog/${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
const order = { lines: [{ productId: "demo-goggles", quantity: 2, unitPrice: "149.00" }], method: "DEMO_UPI", scenario: "approve", attempt: 1 };

beforeEach(() => { requireRole.mockReset(); requireRole.mockResolvedValue(access); });

describe("demo checkout endpoint", () => {
  it("requires only the USER role, and rejects signed-out or unassigned callers", async () => {
    const { POST } = await import("../../src/app/api/v1/catalog/demo-checkout/route");
    await POST(post("demo-checkout", order, { "idempotency-key": "key-12345678" }));
    expect(requireRole).toHaveBeenCalledWith("USER");
    requireRole.mockRejectedValueOnce(new AppError("UNAUTHENTICATED", "Please sign in.", 401));
    expect((await POST(post("demo-checkout", order, { "idempotency-key": "key-12345678" }))).status).toBe(401);
    requireRole.mockRejectedValueOnce(new AppError("FORBIDDEN", "No access.", 403));
    expect((await POST(post("demo-checkout", order, { "idempotency-key": "key-12345678" }))).status).toBe(403);
  });
  it("returns a simulated PAID order and requires an Idempotency-Key", async () => {
    const { POST } = await import("../../src/app/api/v1/catalog/demo-checkout/route");
    const ok = await POST(post("demo-checkout", order, { "idempotency-key": "key-12345678" }));
    expect(ok.status).toBe(200);
    const { data } = await ok.json();
    expect(data).toMatchObject({ outcome: "PAID", order: { total: "298.00", paymentStatus: "DEMO_PAID" } });
    const missing = await POST(post("demo-checkout", order));
    expect(missing.status).toBe(422);
  });
  it("answers a stale cart with 409 CART_CHANGED and the revalidated lines", async () => {
    const { POST } = await import("../../src/app/api/v1/catalog/demo-checkout/route");
    const response = await POST(post("demo-checkout", { ...order, lines: [{ productId: "demo-microscope", quantity: 1, unitPrice: "4999.00" }] }, { "idempotency-key": "key-12345678" }));
    expect(response.status).toBe(409);
    const { error } = await response.json();
    expect(error.code).toBe("CART_CHANGED");
    expect(error.validation.lines[0].issues[0].code).toBe("OUT_OF_STOCK");
  });
  it("refuses cross-origin writes, non-JSON bodies and card data", async () => {
    const { POST } = await import("../../src/app/api/v1/catalog/demo-checkout/route");
    expect((await POST(post("demo-checkout", order, { "idempotency-key": "key-12345678", origin: "http://evil.example" }))).status).toBe(403);
    expect((await POST(new Request("http://localhost/api/v1/catalog/demo-checkout", { method: "POST", headers: { "content-type": "text/plain", "idempotency-key": "key-12345678" }, body: "x" }))).status).toBe(400);
    expect((await POST(post("demo-checkout", { ...order, cardNumber: "4111111111111111", cvv: "123" }, { "idempotency-key": "key-12345678" }))).status).toBe(422);
  });
});

describe("catalog endpoints", () => {
  it("lists the demo catalog for USER without any operational fields", async () => {
    const { GET } = await import("../../src/app/api/v1/catalog/route");
    const response = await GET(new Request("http://localhost/api/v1/catalog?source=demo&sort=price-desc"));
    expect(requireRole).toHaveBeenCalledWith("USER");
    const { data } = await response.json();
    expect(data.items).toHaveLength(12);
    expect(JSON.stringify(data)).not.toMatch(/supplier|threshold|workspace|unitCost/i);
  });
  it("rejects unsupported filter fields", async () => {
    const { GET } = await import("../../src/app/api/v1/catalog/route");
    expect((await GET(new Request("http://localhost/api/v1/catalog?sort=supplier"))).status).toBe(422);
    expect((await GET(new Request("http://localhost/api/v1/catalog?workspaceId=other"))).status).toBe(422);
  });
  it("re-validates a cart and reports problems", async () => {
    const { POST } = await import("../../src/app/api/v1/catalog/validate/route");
    const response = await POST(post("validate", { lines: [{ productId: "demo-uno-board", quantity: 9, unitPrice: "699.00" }] }));
    const { data } = await response.json();
    expect(data.blocking).toBe(true);
    expect(data.lines[0].issues[0]).toMatchObject({ code: "INSUFFICIENT_STOCK", suggestedQuantity: 3 });
  });
});
