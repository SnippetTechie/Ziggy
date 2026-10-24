import { createHash } from "node:crypto";
import { z } from "zod";
import { AppError } from "../../server/errors";
import { demoItems, type CatalogItem } from "./catalog";
import { cartLineSchema, MAX_LINE_QUANTITY, type CartLine } from "./cart";
import type { DemoOrder } from "./orders";
import { lineTotal, sameMoney, sumMoney } from "./money";

export const validateInput = z.object({ lines: z.array(cartLineSchema).max(50) }).strict();
export const paymentMethods = ["DEMO_UPI", "DEMO_CARD"] as const;
export const scenarios = ["approve", "decline", "fail-once"] as const;
export const checkoutInput = z.object({ lines: validateInput.shape.lines, method: z.enum(paymentMethods), scenario: z.enum(scenarios), attempt: z.number().int().min(1).max(50) }).strict();

export type IssueCode = "UNKNOWN_PRODUCT" | "OUT_OF_STOCK" | "INSUFFICIENT_STOCK" | "PRICE_CHANGED";
export type LineIssue = { code: IssueCode; message: string; suggestedQuantity?: number; previousPrice?: string };
export type ValidatedLine = {
  productId: string; name: string; sku: string; imageSrc: string | null; imageAlt: string | null; unit: string;
  quantity: number; unitPrice: string; lineTotal: string; available: number; issues: LineIssue[];
};
export type Validation = { lines: ValidatedLine[]; total: string; blocking: boolean; priceChanged: boolean };

/** Re-prices and re-checks every line against the current demo catalog. */
export function validateCart(input: CartLine[], catalog: CatalogItem[] = demoItems()): Validation {
  const merged = new Map<string, CartLine>();
  for (const line of input) {
    const existing = merged.get(line.productId);
    merged.set(line.productId, existing ? { ...existing, quantity: Math.min(MAX_LINE_QUANTITY, existing.quantity + line.quantity) } : line);
  }
  const lines: ValidatedLine[] = [...merged.values()].map(line => {
    const item = catalog.find(candidate => candidate.id === line.productId && candidate.source === "demo");
    if (!item?.price) return { productId: line.productId, name: "Unavailable product", sku: "", imageSrc: null, imageAlt: null, unit: "", quantity: line.quantity, unitPrice: line.unitPrice, lineTotal: "0.00", available: 0, issues: [{ code: "UNKNOWN_PRODUCT", message: "This product is no longer in the demo catalog. Remove it to continue." }] };
    const available = Math.floor(Number(item.quantity));
    const issues: LineIssue[] = [];
    if (available <= 0) issues.push({ code: "OUT_OF_STOCK", message: `${item.name} is out of stock. Remove it to continue.` });
    else if (line.quantity > available) issues.push({ code: "INSUFFICIENT_STOCK", message: `Only ${available} of ${item.name} ${available === 1 ? "is" : "are"} available; you asked for ${line.quantity}.`, suggestedQuantity: available });
    if (!sameMoney(line.unitPrice, item.price.amount)) issues.push({ code: "PRICE_CHANGED", message: `The price of ${item.name} changed from ₹${line.unitPrice} to ₹${item.price.amount}.`, previousPrice: line.unitPrice });
    return { productId: item.id, name: item.name, sku: item.sku, imageSrc: item.image?.src ?? null, imageAlt: item.image?.alt ?? null, unit: item.unit, quantity: line.quantity, unitPrice: item.price.amount, lineTotal: lineTotal(item.price.amount, line.quantity), available, issues };
  });
  return {
    lines, total: sumMoney(lines.filter(line => !line.issues.some(i => i.code === "UNKNOWN_PRODUCT")).map(line => line.lineTotal)),
    blocking: lines.some(line => line.issues.some(i => i.code !== "PRICE_CHANGED")), priceChanged: lines.some(line => line.issues.some(i => i.code === "PRICE_CHANGED")),
  };
}

export class CartChangedError extends AppError {
  constructor(public validation: Validation) { super("CART_CHANGED", "Some items in your cart changed. Review the cart and try again.", 409); }
}

export type CheckoutResult = { outcome: "PAID"; order: DemoOrder } | { outcome: "FAILED"; reason: "DECLINED" | "TEMPORARY"; message: string };

/** Deterministic reference: the same user + Idempotency-Key always maps to the same demo order reference. */
export function orderRef(scope: string, key: string) {
  return "ZGY-DEMO-" + createHash("sha256").update(`${scope}:${key}`).digest("hex").slice(0, 8).toUpperCase();
}

/**
 * Pure simulation. It performs NO database access and NO stock movement; the demo
 * order exists only in the response and in the caller's browser.
 */
export function placeDemoOrder(input: z.infer<typeof checkoutInput>, scope: string, key: string, now = new Date(), catalog?: CatalogItem[]): CheckoutResult {
  if (!input.lines.length) throw new AppError("EMPTY_CART", "Your cart is empty.", 422);
  const validation = validateCart(input.lines, catalog);
  if (validation.blocking || validation.priceChanged) throw new CartChangedError(validation);
  if (input.scenario === "decline") return { outcome: "FAILED", reason: "DECLINED", message: "Demo payment declined (simulated). No money was charged. Choose another demo option or retry." };
  if (input.scenario === "fail-once" && input.attempt === 1) return { outcome: "FAILED", reason: "TEMPORARY", message: "Demo payment timed out (simulated). No money was charged. Retry to complete the order." };
  return {
    outcome: "PAID",
    order: {
      ref: orderRef(scope, key), createdAt: now.toISOString(), currency: "INR", total: validation.total, method: input.method, paymentStatus: "DEMO_PAID", demo: true,
      items: validation.lines.map(line => ({ productId: line.productId, name: line.name, sku: line.sku, imageSrc: line.imageSrc, imageAlt: line.imageAlt, quantity: line.quantity, unitPrice: line.unitPrice, lineTotal: line.lineTotal })),
    },
  };
}
