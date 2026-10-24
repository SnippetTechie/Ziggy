import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyQuery, catalogQuery, demoItems, liveItem } from "../../src/modules/demo-store/catalog";
import { addLine, cartCount, parseCart, removeLine, serializeCart, setLineQuantity } from "../../src/modules/demo-store/cart";
import { CartChangedError, checkoutInput, orderRef, placeDemoOrder, validateCart } from "../../src/modules/demo-store/checkout";
import { DEMO_PRODUCTS } from "../../src/modules/demo-store/demo-catalog";
import { formatInr, lineTotal, sumMoney } from "../../src/modules/demo-store/money";
import { addOrder, parseOrders, serializeOrders } from "../../src/modules/demo-store/orders";

const root = join(__dirname, "../..");
const query = (over: Record<string, string> = {}) => catalogQuery.parse(over);
const line = (productId: string, quantity = 1, unitPrice?: string) => ({ productId, quantity, unitPrice: unitPrice ?? demoItems().find(i => i.id === productId)!.price!.amount });
const checkout = (lines: ReturnType<typeof line>[], over: Partial<{ scenario: "approve" | "decline" | "fail-once"; attempt: number }> = {}) => checkoutInput.parse({ lines, method: "DEMO_UPI", scenario: "approve", attempt: 1, ...over });

describe("money", () => {
  it("uses decimal arithmetic, not floats", () => {
    expect(lineTotal("0.10", 3)).toBe("0.30");
    expect(sumMoney(["0.10", "0.20"])).toBe("0.30");
    expect(sumMoney(["749.50", "60.00", "249.00"])).toBe("1058.50");
  });
  it("formats rupees with Indian grouping", () => {
    expect(formatInr("899")).toBe("₹899.00");
    expect(formatInr("4999.5")).toBe("₹4,999.50");
    expect(formatInr("1234567.8")).toBe("₹12,34,567.80");
  });
});

describe("demo catalog", () => {
  it("is clearly separate from live data: demo ids/SKUs, prices present, unique", () => {
    const items = demoItems();
    expect(new Set(items.map(i => i.id)).size).toBe(items.length);
    for (const item of items) { expect(item.id.startsWith("demo-")).toBe(true); expect(item.sku.startsWith("DEMO-")).toBe(true); expect(item.source).toBe("demo"); expect(item.price?.label).toBe("Demo price"); }
  });
  it("has an on-disk image, alt text and licence record for every product", () => {
    const manifest = JSON.parse(readFileSync(join(root, "public/images/demo/manifest.json"), "utf8")).images;
    for (const product of DEMO_PRODUCTS) {
      const entry = manifest[product.image];
      expect(entry, product.name).toBeDefined();
      expect(existsSync(join(root, "public", entry.file)), entry.file).toBe(true);
      expect(entry.alt.length).toBeGreaterThan(10);
      expect(entry.license && entry.source && entry.author).toBeTruthy();
    }
  });
  it("includes in-stock, low-stock and out-of-stock samples", () => {
    const statuses = new Set(demoItems().map(i => i.stockStatus));
    expect(statuses).toEqual(new Set(["In stock", "Low stock", "Out of stock"]));
    expect(demoItems().filter(i => i.stockStatus === "Out of stock").every(i => !i.purchasable)).toBe(true);
  });
  it("searches, filters by category and availability, and sorts", () => {
    const items = demoItems();
    expect(applyQuery(items, query({ search: "goggles" })).map(i => i.id)).toEqual(["demo-goggles"]);
    expect(applyQuery(items, query({ search: "demo-lab-004" })).map(i => i.id)).toEqual(["demo-microscope"]);
    expect(applyQuery(items, query({ categoryId: "demo-cat-lab" })).every(i => i.categoryId === "demo-cat-lab")).toBe(true);
    expect(applyQuery(items, query({ stock: "available" })).some(i => i.id === "demo-microscope")).toBe(false);
    const asc = applyQuery(items, query({ sort: "price-asc" })).map(i => Number(i.price!.amount));
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    expect(applyQuery(items, query({ sort: "price-desc" }))[0].id).toBe("demo-microscope");
    expect(applyQuery(items, query({ sort: "availability" }))[0].id).toBe("demo-beaker-100");
    expect(applyQuery(items, query({ search: "no-such-thing" }))).toEqual([]);
  });
  it("rejects unknown query fields and bad sort values", () => {
    expect(() => catalogQuery.parse({ sort: "supplier" })).toThrow();
    expect(() => catalogQuery.parse({ workspaceId: "x" })).toThrow();
  });
});

describe("live product projection (USER-safe)", () => {
  it("never carries a price, thresholds, workspace or supplier data, and cannot be purchased", () => {
    const row = { id: "9d1c9d2e-0000-4000-8000-000000000001", sku: "A-1", name: "Gloves", description: null, category: "Lab", categoryId: null, unitLabel: "box", quantity: "4.000000", stockStatus: "Low stock", lowStockThreshold: "10", workspaceId: "w", createdAt: "x", isActive: true };
    const item = liveItem(row);
    expect(item.price).toBeNull();
    expect(item.purchasable).toBe(false);
    expect(Object.keys(item).sort()).toEqual(["category", "categoryId", "description", "id", "image", "maxQuantity", "name", "price", "purchasable", "quantity", "sku", "source", "stockStatus", "unit"]);
    expect(JSON.stringify(item)).not.toMatch(/threshold|workspace|supplier|createdAt/i);
  });
  it("sorts unpriced live items last by price and by name otherwise", () => {
    const mk = (name: string) => liveItem({ id: name, sku: name, name, description: "", category: null, categoryId: null, unitLabel: "pcs", quantity: "5", stockStatus: "In stock" });
    expect(applyQuery([mk("b"), mk("a")], query({ source: "live", sort: "price-asc" })).map(i => i.id)).toEqual(["a", "b"]);
  });
});

describe("cart", () => {
  it("adds, merges, clamps, updates and removes", () => {
    let lines = addLine([], line("demo-pen-steel", 3), 8);
    lines = addLine(lines, line("demo-pen-steel", 9), 8);
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(8); // clamped to available stock
    lines = setLineQuantity(lines, "demo-pen-steel", 0, 8);
    expect(lines[0].quantity).toBe(1);
    expect(cartCount(addLine(lines, line("demo-goggles", 2), 60))).toBe(3);
    expect(removeLine(lines, "demo-pen-steel")).toEqual([]);
  });
  it("ignores corrupt or tampered local storage", () => {
    expect(parseCart("")).toEqual([]);
    expect(parseCart("{not json")).toEqual([]);
    expect(parseCart(JSON.stringify([{ productId: "x", quantity: -1, unitPrice: "1.00" }]))).toEqual([]);
    expect(parseCart(JSON.stringify([{ productId: "x", quantity: 1, unitPrice: "1.00", extra: "name" }]))).toEqual([]);
    expect(parseCart(serializeCart([line("demo-goggles")]))).toEqual([line("demo-goggles")]);
  });
});

describe("checkout validation", () => {
  it("prices lines on the server and totals with decimals", () => {
    const result = validateCart([line("demo-usb-drive", 2), line("demo-notebook-a7", 1)]);
    expect(result.blocking).toBe(false);
    expect(result.total).toBe("1559.00");
  });
  it("flags out-of-stock, insufficient stock, unknown products and changed prices", () => {
    expect(validateCart([line("demo-microscope", 1)]).lines[0].issues[0].code).toBe("OUT_OF_STOCK");
    const short = validateCart([line("demo-uno-board", 5)]).lines[0].issues[0];
    expect(short).toMatchObject({ code: "INSUFFICIENT_STOCK", suggestedQuantity: 3 });
    expect(validateCart([{ productId: "demo-gone", quantity: 1, unitPrice: "1.00" }]).lines[0].issues[0].code).toBe("UNKNOWN_PRODUCT");
    const changed = validateCart([line("demo-goggles", 1, "99.00")]);
    expect(changed.priceChanged).toBe(true);
    expect(changed.blocking).toBe(false); // price change needs confirmation but is not a stock problem
    expect(changed.lines[0].unitPrice).toBe("149.00"); // authoritative price wins
  });
  it("never sells a live product, even if a client puts its id in the cart", () => {
    const live = liveItem({ id: "9d1c9d2e-0000-4000-8000-000000000001", sku: "A", name: "Gloves", description: "", category: null, categoryId: null, unitLabel: "box", quantity: "50", stockStatus: "In stock" });
    const result = validateCart([{ productId: live.id, quantity: 1, unitPrice: "10.00" }], [live]);
    expect(result.lines[0].issues[0].code).toBe("UNKNOWN_PRODUCT");
    expect(result.blocking).toBe(true);
  });
  it("merges duplicate lines", () => {
    expect(validateCart([line("demo-goggles", 2), line("demo-goggles", 3)]).lines).toMatchObject([{ quantity: 5 }]);
  });
  it("rejects malformed payloads", () => {
    expect(() => checkoutInput.parse({ lines: [{ productId: "x", quantity: 1.5, unitPrice: "1.00" }], method: "DEMO_UPI", scenario: "approve", attempt: 1 })).toThrow();
    expect(() => checkoutInput.parse({ lines: [], method: "VISA", scenario: "approve", attempt: 1 })).toThrow();
    expect(() => checkoutInput.parse({ lines: [], method: "DEMO_CARD", scenario: "approve", attempt: 1, cardNumber: "4111111111111111" })).toThrow(); // card data is never accepted
  });
});

describe("simulated payment", () => {
  const scope = "workspace-1:user-1";
  it("approve: returns a demo order with a stable reference", () => {
    const result = placeDemoOrder(checkout([line("demo-goggles", 2)]), scope, "key-12345678");
    expect(result.outcome).toBe("PAID");
    if (result.outcome !== "PAID") return;
    expect(result.order).toMatchObject({ currency: "INR", total: "298.00", paymentStatus: "DEMO_PAID", demo: true });
    expect(result.order.ref).toMatch(/^ZGY-DEMO-[0-9A-F]{8}$/);
    expect(placeDemoOrder(checkout([line("demo-goggles", 2)]), scope, "key-12345678")).toMatchObject({ order: { ref: result.order.ref } }); // same key = same order
    expect(orderRef(scope, "another-key-1")).not.toBe(result.order.ref);
    expect(orderRef("workspace-1:user-2", "key-12345678")).not.toBe(result.order.ref);
    expect(parseOrders(serializeOrders(addOrder(addOrder([], result.order), result.order)))).toHaveLength(1); // replay does not duplicate
  });
  it("decline: always fails and says no money moved", () => {
    for (const attempt of [1, 2, 3]) {
      const result = placeDemoOrder(checkout([line("demo-goggles")], { scenario: "decline", attempt }), scope, "key-12345678");
      expect(result).toMatchObject({ outcome: "FAILED", reason: "DECLINED" });
      expect(result.outcome === "FAILED" && result.message).toMatch(/no money was charged/i);
    }
  });
  it("fail-once: first attempt fails, retry succeeds", () => {
    expect(placeDemoOrder(checkout([line("demo-goggles")], { scenario: "fail-once", attempt: 1 }), scope, "key-12345678").outcome).toBe("FAILED");
    expect(placeDemoOrder(checkout([line("demo-goggles")], { scenario: "fail-once", attempt: 2 }), scope, "key-12345678").outcome).toBe("PAID");
  });
  it("rejects an empty cart and stale carts without simulating payment", () => {
    expect(() => placeDemoOrder(checkout([]), scope, "key-12345678")).toThrow(/empty/i);
    expect(() => placeDemoOrder(checkout([line("demo-microscope")]), scope, "key-12345678")).toThrow(CartChangedError);
    expect(() => placeDemoOrder(checkout([line("demo-uno-board", 4)]), scope, "key-12345678")).toThrow(CartChangedError);
    expect(() => placeDemoOrder(checkout([line("demo-goggles", 1, "1.00")]), scope, "key-12345678")).toThrow(CartChangedError);
  });
  it("does not change the demo catalog (stateless simulation)", () => {
    const before = JSON.stringify(demoItems());
    placeDemoOrder(checkout([line("demo-goggles", 5)]), scope, "key-12345678");
    expect(JSON.stringify(demoItems())).toBe(before);
  });
});

describe("orders store", () => {
  it("keeps valid orders and drops corrupt entries", () => {
    const ok = placeDemoOrder(checkout([line("demo-goggles")]), "s", "key-12345678");
    if (ok.outcome !== "PAID") throw new Error("expected paid");
    expect(parseOrders(JSON.stringify([ok.order, { ref: "bad" }, 7]))).toEqual([ok.order]);
    expect(parseOrders("nonsense")).toEqual([]);
  });
});

describe("isolation from operational inventory", () => {
  const files = [
    ...readdirSync(join(root, "src/modules/demo-store")).map(f => join("src/modules/demo-store", f)),
    "src/app/api/v1/catalog/demo-checkout/route.ts", "src/app/api/v1/catalog/validate/route.ts", "src/server/shop/handler.ts",
  ];
  it("demo checkout code never imports the database, stock posting or movement tables", () => {
    for (const file of files) {
      const source = readFileSync(join(root, file), "utf8");
      expect(source, file).not.toMatch(/server\/db|postStock|inventory\/service|stock_movements|movements\b.*from|balances/);
    }
  });
  it("only the live read path touches the database, and only through the read-only listProducts query", () => {
    const source = readFileSync(join(root, "src/server/shop/live-catalog.ts"), "utf8");
    expect(source).not.toMatch(/insert\(|update\(|delete\(|postStock/);
  });
});
