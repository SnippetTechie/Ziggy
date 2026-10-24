import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { balances, locations, members, movements, products, users, workspaces } from "../../src/server/db/schema";
import { live, sharedRollback, type Tx } from "../helpers/live";
import type { Access } from "../../src/modules/access/policy";

const holder = vi.hoisted(() => ({ tx: null as unknown as Tx }));
vi.mock("server-only", () => ({}));
vi.mock("react", async original => ({ ...(await original<typeof import("react")>()), cache: <T>(fn: T) => fn }));
vi.mock("@/server/db", () => ({ db: new Proxy({}, { get(_, prop) {
  const value = holder.tx[prop as keyof Tx];
  return typeof value === "function" ? value.bind(holder.tx) : value;
} }) }));
import { listOrders, placeOrder, transitionOrder } from "../../src/modules/orders/service";
import { postStock } from "../../src/modules/inventory/service";
import { orders } from "../../src/modules/orders/tables";
import { resolveDevMember } from "../../src/server/auth/dev-login";

async function build(tx: Tx) {
  const stamp = crypto.randomUUID();
  const [ws] = await tx.insert(workspaces).values({ name: "Presentation order fixture", slug: stamp }).returning();
  const [loc] = await tx.insert(locations).values({ workspaceId: ws.id, name: "Main", code: "MAIN" }).returning();
  const [loc2] = await tx.insert(locations).values({ workspaceId: ws.id, name: "Second", code: "SECOND" }).returning();
  const access = {} as Record<"admin" | "user" | "other" | "suspended", Access>;
  for (const who of ["admin", "user", "other", "suspended"] as const) {
    const [u] = await tx.insert(users).values({ clerkUserId: `${stamp}-${who}`, email: `${stamp}-${who}@example.invalid`, displayName: who }).returning();
    const role = who === "admin" ? "ADMIN" : "USER";
    await tx.insert(members).values({ workspaceId: ws.id, userId: u.id, role, status: who === "suspended" ? "SUSPENDED" : "ACTIVE" });
    access[who] = { workspaceId: ws.id, locationId: loc.id, userId: u.id, role };
  }
  const ps = await tx.insert(products).values([0, 1].map(n => ({ workspaceId: ws.id, sku: `FIXTURE-${n}`, name: `Presentation fixture ${n}` }))).returning();
  for (const p of ps) await postStock(access.admin, { productId: p.id, quantity: "5", reasonCode: "OPENING_STOCK", supplierId: null, unitCost: null, reference: "fixture", note: "" }, "STOCK_IN", crypto.randomUUID());
  return { access, ps: ps.sort((a,b) => a.id.localeCompare(b.id)), loc2 };
}

describe.skipIf(!live)("quantity-only orders on real tables (always rolled back)", () => {
  const shared = sharedRollback(async tx => { holder.tx = tx; return build(tx); });
  let f: Awaited<ReturnType<typeof build>>;
  beforeAll(async () => { ({ fixture: f } = await shared.start()); });
  afterAll(async () => { await shared.finish(); });
  const key = () => crypto.randomUUID();

  it("rejects a suspended actor even with a stale Access object", async () => {
    await expect(placeOrder(f.access.suspended, { items: [{ productId: f.ps[0].id, quantity: "1" }] }, key())).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("replays placement, isolates customers/workspaces, enforces transitions and deducts once", async () => {
    const input = { items: [{ productId: f.ps[0].id, quantity: "2" }] };
    const submit = key();
    const order = await placeOrder(f.access.user, input, submit);
    expect((await placeOrder(f.access.user, input, submit)).id).toBe(order.id);
    await expect(placeOrder(f.access.other, input, submit)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    expect(await listOrders(f.access.other, "mine")).toEqual([]);
    await expect(listOrders(f.access.user, "all")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(transitionOrder(f.access.user, order.id, "confirm")).rejects.toMatchObject({ code: "FORBIDDEN" });
    const foreign = { ...f.access.admin, workspaceId: crypto.randomUUID() };
    expect(await listOrders(foreign, "all")).toEqual([]);
    await expect(transitionOrder(foreign, order.id, "confirm")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(transitionOrder(f.access.admin, order.id, "fulfil")).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await transitionOrder(f.access.admin, order.id, "confirm");
    // The order's location is authoritative, even if the Admin selected another location.
    const actingElsewhere = { ...f.access.admin, locationId: f.loc2.id };
    expect((await transitionOrder(actingElsewhere, order.id, "fulfil")).status).toBe("FULFILLED");
    await transitionOrder(f.access.admin, order.id, "fulfil");
    const ms = await holder.tx.select().from(movements).where(eq(movements.reference, order.ref));
    expect(ms).toHaveLength(1); expect(ms[0].balanceAfter).toBe("3.000000"); expect(ms[0].locationId).toBe(f.access.user.locationId);
    await expect(transitionOrder(f.access.admin, order.id, "cancel")).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
  });

  it("rolls back earlier item deductions and status when a later item lacks stock", async () => {
    const order = await placeOrder(f.access.user, { items: f.ps.map(p => ({ productId: p.id, quantity: "1" })) }, key());
    await transitionOrder(f.access.admin, order.id, "confirm");
    await postStock(f.access.admin, { productId: f.ps[1].id, quantity: "5", reasonCode: "ISSUE", supplierId: null, unitCost: null, reference: "fixture-drain", note: "" }, "STOCK_OUT", key());
    const where = and(eq(balances.workspaceId, f.access.user.workspaceId), eq(balances.productId, f.ps[0].id));
    const before = await holder.tx.select().from(balances).where(where);
    await expect(transitionOrder(f.access.admin, order.id, "fulfil")).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
    expect(await holder.tx.select().from(balances).where(where)).toEqual(before);
    expect(await holder.tx.select().from(movements).where(eq(movements.reference, order.ref))).toEqual([]);
    expect((await holder.tx.select().from(orders).where(eq(orders.id, order.id)))[0].status).toBe("CONFIRMED");
  });

  it("resolves the same dedicated demo user and refuses promoted or suspended membership", async () => {
    const one = await resolveDevMember("user"), two = await resolveDevMember("user");
    expect(one.user.id).toBe(two.user.id); expect(one.role).toBe("USER");
    const condition = and(eq(members.workspaceId, one.workspaceId), eq(members.userId, one.user.id));
    await holder.tx.update(members).set({ role: "ADMIN" }).where(condition);
    await expect(resolveDevMember("user")).rejects.toMatchObject({ code: "DEMO_USER_INVALID" });
    await holder.tx.update(members).set({ role: "USER", status: "SUSPENDED" }).where(condition);
    await expect(resolveDevMember("user")).rejects.toMatchObject({ status: 403 });
  });
});
