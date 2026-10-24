import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq, sql } from "drizzle-orm";
import { balances, categories, locations, members, movements, products, suppliers, users, workspaces } from "../../src/server/db/schema";
import { live, sharedRollback, type Tx } from "../helpers/live";

/**
 * The teammate's REAL route handler, auth helpers and services, running against
 * the real tables of the configured database inside one transaction that is
 * always rolled back. Only the Clerk session (who is calling) and the `db`
 * export (pointed at that transaction) are substituted; membership and role
 * come from the real `workspace_members` rows via the real getAccess().
 */
const holder = vi.hoisted(() => ({ ex: null as unknown, clerkId: null as string | null }));
vi.mock("server-only", () => ({}));
vi.mock("react", async importOriginal => ({ ...(await importOriginal<typeof import("react")>()), cache: <T>(fn: T) => fn }));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: holder.clerkId }), currentUser: async () => null }));
vi.mock("@/server/db", () => ({
  pool: {},
  db: new Proxy(
    {},
    {
      get(_target, prop) {
        const ex = holder.ex as Record<string | symbol, unknown>;
        const value = ex[prop];
        return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(ex) : value;
      },
    },
  ),
}));
import { GET, POST, PATCH, DELETE } from "@/app/api/v1/[...path]/route";

type Who = "admin" | "staff" | "user" | "suspended" | "none" | "admin2" | "nobody";
const handlers = { GET, POST, PATCH, DELETE } as const;
const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const clerk: Record<Exclude<Who, "nobody">, string> = Object.fromEntries(
  ["admin", "staff", "user", "suspended", "none", "admin2"].map(w => [w, `live_${w}_${stamp}`]),
) as Record<Exclude<Who, "nobody">, string>;

type Res = { status: number; text: string; json?: { data?: unknown; error?: { code: string; message: string } } };
async function api(who: Who, method: keyof typeof handlers, path: string, body?: unknown, key?: string): Promise<Res> {
  holder.clerkId = who === "nobody" ? null : clerk[who];
  const res = await handlers[method](
    new Request(`http://localhost:3000/api/v1/${path}`, {
      method,
      headers: { "content-type": "application/json", ...(key ? { "idempotency-key": key } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
    { params: Promise.resolve({ path: path.split("?")[0].split("/") }) },
  );
  const text = await res.text();
  return { status: res.status, text, json: res.headers.get("content-type")?.includes("json") ? JSON.parse(text) : undefined };
}
const data = <T>(res: Res) => res.json?.data as T;
type Page<T> = { items: T[]; nextCursor: string | null; total?: number };
type Prod = { id: string; name: string; sku: string; quantity: string; stockStatus: string };
type Move = { id: string; balanceAfter: string; quantity: string; movementType: string; reference: string };
const key = () => `live-${crypto.randomUUID()}`;

async function build(tx: Tx) {
  const one = async <T>(q: Promise<T[]>) => (await q)[0];
  const ws = await one(tx.insert(workspaces).values({ name: "Live fixture", slug: `live-fx-${stamp}`, settings: { defaultLowStockThreshold: "10" } }).returning());
  const ws2 = await one(tx.insert(workspaces).values({ name: "Other tenant", slug: `live-fx2-${stamp}`, settings: { defaultLowStockThreshold: "10" } }).returning());
  const loc = await one(tx.insert(locations).values({ workspaceId: ws.id, name: "Main", code: "MAIN" }).returning());
  const loc2 = await one(tx.insert(locations).values({ workspaceId: ws2.id, name: "Main", code: "MAIN" }).returning());
  const mk = async (who: keyof typeof clerk) =>
    one(tx.insert(users).values({ clerkUserId: clerk[who], email: `${who}-${stamp}@example.invalid`, displayName: `Fixture ${who}` }).returning());
  const [admin, staff, user, suspended, none, admin2] = [await mk("admin"), await mk("staff"), await mk("user"), await mk("suspended"), await mk("none"), await mk("admin2")];
  await tx.insert(members).values([
    { workspaceId: ws.id, userId: admin.id, role: "ADMIN" },
    { workspaceId: ws.id, userId: staff.id, role: "STAFF" },
    { workspaceId: ws.id, userId: user.id, role: "USER" },
    { workspaceId: ws.id, userId: suspended.id, role: "ADMIN", status: "SUSPENDED" },
    { workspaceId: ws2.id, userId: admin2.id, role: "ADMIN" },
  ]);
  // Another tenant's data: must never be visible, countable, or writable from `ws`.
  const cat2 = await one(tx.insert(categories).values({ workspaceId: ws2.id, name: "Other category" }).returning());
  const sup2 = await one(tx.insert(suppliers).values({ workspaceId: ws2.id, name: "Other supplier" }).returning());
  const p2 = await one(tx.insert(products).values({ workspaceId: ws2.id, sku: "OTHER-1", name: "Other tenant product", lowStockThreshold: "100", categoryId: cat2.id }).returning());
  await tx.insert(balances).values({ workspaceId: ws2.id, locationId: loc2.id, productId: p2.id, quantityOnHand: "1" });
  await tx.insert(movements).values({ workspaceId: ws2.id, locationId: loc2.id, productId: p2.id, movementType: "STOCK_IN", reasonCode: "PURCHASE", quantity: "1", balanceAfter: "1", idempotencyKey: `fx-${stamp}`, createdBy: admin2.id, reference: "OTHER-MOVE" });
  return { ws, ws2, loc, admin, staff, user, suspended, none, admin2, cat2, sup2, p2 };
}

describe.skipIf(!live)("shared inventory flow on the real tables (rolled back)", () => {
  const shared = sharedRollback(build);
  let tx: Tx;
  let f: Awaited<ReturnType<typeof build>>;
  // Ids created by the flow, shared across the ordered tests below.
  const ids = { category: "", supplier: "", product: "" };

  beforeAll(async () => {
    // This suite exercises Clerk sessions, independent of local presentation flags.
    vi.stubEnv("ZIGGY_DEV_LOGIN", "0");
    vi.stubEnv("ZIGGY_DEV_AUTH_ROLE", "");
    ({ tx, fixture: f } = await shared.start());
    holder.ex = tx;
  });
  afterAll(async () => {
    await shared.finish();
    vi.unstubAllEnvs();
  });

  it("unauthenticated, no-membership and suspended users get no business data", async () => {
    for (const who of ["nobody", "none", "suspended"] as const) {
      const expected = who === "nobody" ? 401 : 403;
      for (const [method, path] of [["GET", "products"], ["GET", "dashboard/summary"], ["GET", "alerts/low-stock"], ["GET", "stock-movements"], ["GET", "reports/stock-summary"], ["GET", "members"]] as const) {
        const res = await api(who, method, path);
        expect(res.status, `${who} ${method} ${path}`).toBe(expected);
        expect(res.json?.data).toBeUndefined();
        expect(res.text).not.toContain("Other tenant");
      }
      expect((await api(who, "POST", "stock-in", {}, key())).status).toBe(expected);
    }
  });

  it("USER can read products but cannot invoke staff or admin operations", async () => {
    expect((await api("user", "GET", "products")).status).toBe(200);
    expect((await api("user", "GET", "categories")).status).toBe(200);
    for (const [method, path, body] of [
      ["GET", "suppliers"], ["GET", "stock-movements"], ["GET", "dashboard/summary"], ["GET", "alerts/low-stock"], ["GET", "reports/stock-summary"], ["GET", "reports/movements?format=csv"], ["GET", "members"], ["GET", "settings"],
      ["POST", "stock-in", { productId: f.p2.id, quantity: "1", reasonCode: "PURCHASE" }], ["POST", "stock-out", { productId: f.p2.id, quantity: "1", reasonCode: "ISSUE" }], ["POST", "products", { sku: "X", name: "X" }], ["POST", "categories", { name: "X" }],
    ] as const) {
      const res = await api("user", method, path, body, key());
      expect(res.status, `USER ${method} ${path}`).toBe(403);
    }
  });

  it("STAFF can operate stock and read alerts but cannot reach admin functions", async () => {
    for (const path of ["suppliers", "stock-movements", "dashboard/summary", "alerts/low-stock"]) expect((await api("staff", "GET", path)).status, path).toBe(200);
    for (const [method, path, body] of [
      ["GET", "reports/stock-summary"], ["GET", "reports/stock-summary?format=csv"], ["GET", "reports/movements"], ["GET", "members"], ["GET", "members/pending"], ["GET", "audit-logs"],
      ["POST", "products", { sku: "S", name: "S" }], ["POST", "categories", { name: "S" }], ["POST", "suppliers", { name: "S" }], ["PATCH", `members/${f.user.id}`, { role: "ADMIN" }], ["PATCH", "settings", { defaultLowStockThreshold: "1" }],
    ] as const) {
      expect((await api("staff", method, path, body, key())).status, `STAFF ${method} ${path}`).toBe(403);
    }
  });

  it("ADMIN: add category, supplier and a product with opening stock", async () => {
    const cat = await api("admin", "POST", "categories", { name: "Grains" });
    expect(cat.status).toBe(201);
    ids.category = data<{ id: string }>(cat).id;
    const sup = await api("admin", "POST", "suppliers", { name: "Acme Traders", email: "", phone: "", address: "" });
    expect(sup.status).toBe(201);
    ids.supplier = data<{ id: string }>(sup).id;
    const prod = await api("admin", "POST", "products", { sku: "RICE-5", name: "Rice 5kg", categoryId: ids.category, unitLabel: "bag", lowStockThreshold: "5", openingQuantity: "12" });
    expect(prod.status).toBe(201);
    ids.product = data<{ id: string }>(prod).id;

    const got = data<Prod>(await api("user", "GET", `products/${ids.product}`));
    expect(got.quantity).toBe("12.000000");
    const dup = await api("admin", "POST", "products", { sku: "RICE-5", name: "Duplicate sku" });
    expect(dup.status).toBe(409); // SKU unique per workspace
    expect(dup.json?.error?.code).toBe("DUPLICATE");
  });

  it("stock out updates the quantity, dashboard and low-stock alerts consistently", async () => {
    let summary = data<{ products: number; low: number; out: number }>(await api("staff", "GET", "dashboard/summary"));
    expect(summary).toMatchObject({ products: 1, low: 0, out: 0 });

    const out8 = await api("staff", "POST", "stock-out", { productId: ids.product, quantity: "8", reasonCode: "ISSUE", reference: "ISS-1" }, key());
    expect(out8.status).toBe(201);
    expect(data<Move>(out8).balanceAfter).toBe("4.000000");

    summary = data<{ products: number; low: number; out: number }>(await api("staff", "GET", "dashboard/summary"));
    expect(summary).toMatchObject({ products: 1, low: 1, out: 0 }); // 4 <= threshold 5
    const alerts = data<Page<Prod>>(await api("staff", "GET", "alerts/low-stock"));
    expect(alerts.total).toBe(1);
    expect(alerts.items[0]).toMatchObject({ name: "Rice 5kg", quantity: "4.000000", stockStatus: "Low stock" });
    expect(JSON.stringify(alerts)).not.toContain("Other tenant"); // other tenant's low product never appears
  });

  it("an issue larger than the available stock is rejected and changes nothing", async () => {
    const res = await api("staff", "POST", "stock-out", { productId: ids.product, quantity: "5", reasonCode: "ISSUE" }, key());
    expect(res.status).toBe(422);
    expect(res.json?.error?.code).toBe("INSUFFICIENT_STOCK");
    expect(data<Prod>(await api("user", "GET", `products/${ids.product}`)).quantity).toBe("4.000000");
    const [row] = await tx.select().from(balances).where(and(eq(balances.productId, ids.product), eq(balances.workspaceId, f.ws.id)));
    expect(row.quantityOnHand).toBe("4.000000"); // never negative
  });

  it("emptying the stock shows Out of stock, distinct from Low stock", async () => {
    const res = await api("staff", "POST", "stock-out", { productId: ids.product, quantity: "4", reasonCode: "USED" }, key());
    expect(data<Move>(res).balanceAfter).toBe("0.000000");
    const summary = data<{ low: number; out: number }>(await api("staff", "GET", "dashboard/summary"));
    expect(summary).toMatchObject({ low: 1, out: 1 }); // `low` counts every product at/below threshold, zero included
    const alerts = data<Page<Prod>>(await api("staff", "GET", "alerts/low-stock"));
    expect(alerts.items[0]).toMatchObject({ quantity: "0.000000", stockStatus: "Out of stock" });
  });

  it("a retried submission (same Idempotency-Key) never duplicates a movement", async () => {
    const k = key();
    const body = { productId: ids.product, quantity: "2", reasonCode: "PURCHASE", supplierId: ids.supplier, unitCost: "30", reference: "INV-9" };
    const first = await api("staff", "POST", "stock-in", body, k);
    const retry = await api("staff", "POST", "stock-in", body, k);
    expect(first.status).toBe(201);
    expect(data<Move>(retry).id).toBe(data<Move>(first).id);
    expect(data<Prod>(await api("user", "GET", `products/${ids.product}`)).quantity).toBe("2.000000"); // 2, not 4
    const conflict = await api("staff", "POST", "stock-in", { ...body, quantity: "3" }, k);
    expect(conflict.status).toBe(409);
    expect(conflict.json?.error?.code).toBe("IDEMPOTENCY_CONFLICT");
    expect((await api("staff", "POST", "stock-in", body)).status).toBe(422); // key is mandatory
  });

  it("movement history, reports and CSV agree with the stock changes", async () => {
    const history = data<Page<Move>>(await api("staff", "GET", "stock-movements"));
    const mine = history.items.filter(m => m.reference !== "OTHER-MOVE");
    expect(history.items.some(m => m.reference === "OTHER-MOVE")).toBe(false); // workspace-scoped
    expect(mine).toHaveLength(4); // opening stock, issue 8, issue 4, purchase 2
    expect(mine.map(m => m.balanceAfter).sort()).toEqual(["0.000000", "12.000000", "2.000000", "4.000000"]);
    expect(mine.filter(m => m.movementType === "STOCK_IN")).toHaveLength(2);

    const report = data<Page<Prod>>(await api("admin", "GET", "reports/stock-summary"));
    expect(report.items.map(p => p.name)).toEqual(["Rice 5kg"]);
    expect(report.items[0]).toMatchObject({ quantity: "2.000000", stockStatus: "Low stock" }); // 2 <= 5

    const stockCsv = await api("admin", "GET", "reports/stock-summary?format=csv&limit=1");
    expect(stockCsv.status).toBe(200);
    expect(stockCsv.text.split("\r\n")).toEqual(['"Product","SKU","Category","Unit","Quantity","Status"', '"Rice 5kg","RICE-5","Grains","bag","2.000000","Low stock"']);

    const moveCsv = await api("admin", "GET", "reports/movements?format=csv&limit=1");
    const lines = moveCsv.text.split("\r\n");
    expect(lines).toHaveLength(1 + 4); // every movement, not just limit=1
    expect(lines[0]).toBe('"Date/time (Asia/Kolkata)","Date/time (UTC)","Product","SKU","Type","Reason","Quantity","Balance","Actor","Reference"');
    expect(moveCsv.text).not.toContain("OTHER-MOVE");
  });

  it("an Admin can archive but not delete a product that has history", async () => {
    const del = await api("admin", "DELETE", `products/${ids.product}`);
    expect(del.status).toBe(409);
    expect(del.json?.error?.code).toBe("PRODUCT_HAS_HISTORY");
    expect((await api("admin", "POST", `products/${ids.product}/deactivate`)).status).toBe(201);
    const archivedIn = await api("staff", "POST", "stock-in", { productId: ids.product, quantity: "1", reasonCode: "PURCHASE" }, key());
    expect(archivedIn.status).toBe(404); // archived products cannot receive stock
    expect(data<{ products: number }>(await api("staff", "GET", "dashboard/summary")).products).toBe(0);
    expect((await api("admin", "POST", `products/${ids.product}/reactivate`)).status).toBe(201);
  });

  it("another workspace's records can be neither read nor changed", async () => {
    expect((await api("admin", "GET", `products/${f.p2.id}`)).status).toBe(404);
    expect((await api("admin", "PATCH", `products/${f.p2.id}`, { name: "Hijacked" })).status).toBe(404);
    expect((await api("admin", "DELETE", `products/${f.p2.id}`)).status).toBe(404);
    expect((await api("admin", "PATCH", `categories/${f.cat2.id}`, { name: "Hijacked" })).status).toBe(404);
    expect((await api("admin", "DELETE", `categories/${f.cat2.id}`)).status).toBe(404);
    expect((await api("staff", "POST", "stock-in", { productId: f.p2.id, quantity: "1", reasonCode: "PURCHASE" }, key())).status).toBe(404);
    expect((await api("staff", "POST", "stock-in", { productId: ids.product, quantity: "1", reasonCode: "PURCHASE", supplierId: f.sup2.id }, key())).status).toBe(404);
    // A product cannot be filed under another workspace's category.
    const res = await api("admin", "POST", "products", { sku: "X-1", name: "X", categoryId: f.cat2.id });
    expect(res.status).toBe(404);
    const [other] = await tx.select().from(products).where(eq(products.id, f.p2.id));
    expect(other.name).toBe("Other tenant product");
    expect(JSON.stringify(data(await api("admin", "GET", "categories")))).not.toContain("Other category");
    expect(JSON.stringify(data(await api("staff", "GET", "suppliers")))).not.toContain("Other supplier");
  });

  it("movement dates are whole days in the workspace timezone (inclusive, DST-safe via Postgres)", async () => {
    const prod = (await tx.insert(products).values({ workspaceId: f.ws.id, sku: "TZ-1", name: "Timezone probe" }).returning())[0];
    const at = (iso: string, reference: string) => tx.insert(movements).values({ workspaceId: f.ws.id, locationId: f.loc.id, productId: prod.id, movementType: "STOCK_IN", reasonCode: "PURCHASE", quantity: "1", balanceAfter: "1", idempotencyKey: `tz-${reference}-${stamp}`, createdBy: f.admin.id, reference, occurredAt: new Date(iso) });
    await at("2026-10-01T18:29:59Z", "TZ-1"); // Oct 1 23:59:59 IST
    await at("2026-10-01T18:30:00Z", "TZ-2"); // Oct 2 00:00:00 IST
    await at("2026-10-02T18:29:59Z", "TZ-3"); // Oct 2 23:59:59 IST
    await at("2026-10-02T18:30:00Z", "TZ-4"); // Oct 3 00:00:00 IST
    const refs = async (q: string) => data<Page<Move>>(await api("admin", "GET", `reports/movements?${q}`)).items.map(m => m.reference).sort();
    expect(await refs("from=2026-10-02&to=2026-10-02")).toEqual(["TZ-2", "TZ-3"]);
    expect(await refs("to=2026-10-01")).toEqual(["TZ-1"]);
    expect((await api("admin", "GET", "reports/movements?from=2026-10-03&to=2026-10-02")).status).toBe(422);
    expect((await api("admin", "GET", "reports/movements?from=bogus")).status).toBe(422);
    const csvRefs = (await api("admin", "GET", "reports/movements?format=csv&from=2026-10-02&to=2026-10-02")).text.split("\r\n").slice(1).map(l => l.split(",").at(-1));
    expect(csvRefs.sort()).toEqual(['"TZ-2"', '"TZ-3"']);

    // The same instants fall on different days if the workspace timezone is UTC.
    await tx.execute(sql`update workspaces set settings = settings || '{"timezone":"UTC"}'::jsonb where id = ${f.ws.id}`);
    expect(await refs("from=2026-10-02&to=2026-10-02")).toEqual(["TZ-3", "TZ-4"]);
  });

  it("movement pagination never skips rows whose timestamps differ by microseconds (regression)", async () => {
    const prod = (await tx.insert(products).values({ workspaceId: f.ws.id, sku: "PAG-1", name: "Pagination probe" }).returning())[0];
    for (let i = 1; i <= 5; i++) {
      // Same millisecond, different microseconds: a JS Date round-trip collapses these and drops rows.
      await tx.execute(sql`insert into stock_movements
        (workspace_id, location_id, product_id, movement_type, reason_code, quantity, balance_after, idempotency_key, created_by, reference, created_at, occurred_at)
        values (${f.ws.id}, ${f.loc.id}, ${prod.id}, 'STOCK_IN', 'PURCHASE', '1', ${String(i)}, ${`pag-${i}-${stamp}`}, ${f.admin.id}, ${`PAG-${i}`},
                ${`2026-10-05T10:00:00.12345${i}+00`}::timestamptz, ${`2026-10-05T10:00:00.12345${i}+00`}::timestamptz)`);
    }
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page: Page<Move> = data(await api("staff", "GET", `stock-movements?productId=${prod.id}&limit=2${cursor ? `&cursor=${cursor}` : ""}`));
      seen.push(...page.items.map(m => m.reference));
      cursor = page.nextCursor;
      pages++;
    } while (cursor && pages < 10);
    expect(seen.sort()).toEqual(["PAG-1", "PAG-2", "PAG-3", "PAG-4", "PAG-5"]);
    // The CSV export pages the same way, so it must contain every row too.
    const csvText = (await api("admin", "GET", `reports/movements?format=csv&productId=${prod.id}`)).text;
    expect(csvText.split("\r\n")).toHaveLength(1 + 5);
  });

  it("the last active Admin is protected; role changes apply immediately; nobody is auto-promoted", async () => {
    // `suspended` is an ADMIN row but not ACTIVE, so `admin` is the only active Admin.
    const demote = await api("admin", "PATCH", `members/${f.admin.id}`, { role: "STAFF" });
    expect(demote.status).toBe(409);
    expect(demote.json?.error?.code).toBe("LAST_ADMIN");
    expect((await api("admin", "PATCH", `members/${f.admin.id}`, { role: "ADMIN", status: "SUSPENDED" })).status).toBe(409);

    // A signed-in user with no membership stays that way, however many requests they make.
    expect((await api("none", "GET", "products")).status).toBe(403);
    const memberships = await tx.select().from(members).where(eq(members.userId, f.none.id));
    expect(memberships).toHaveLength(0);

    // Promote a second admin, then demote the first: the demoted account loses admin access at once.
    expect((await api("admin", "PATCH", `members/${f.user.id}`, { role: "ADMIN" })).status).toBe(200);
    expect((await api("admin", "PATCH", `members/${f.admin.id}`, { role: "STAFF" })).status).toBe(200);
    expect((await api("admin", "POST", "categories", { name: "Nope" })).status).toBe(403);
    expect((await api("admin", "GET", "dashboard/summary")).status).toBe(200); // still STAFF
    expect((await api("user", "GET", "members")).status).toBe(200); // promoted account now has admin access
    // Suspending an Admin cuts off all access.
    expect((await api("user", "PATCH", `members/${f.staff.id}`, { role: "STAFF", status: "SUSPENDED" })).status).toBe(200);
    expect((await api("staff", "GET", "products")).status).toBe(403);
  });
});
