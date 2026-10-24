import { z } from "zod";
import { moneyPattern } from "./money";

export const demoOrderSchema = z.object({
  ref: z.string().regex(/^ZGY-DEMO-[0-9A-F]{8}$/), createdAt: z.iso.datetime(), currency: z.literal("INR"), total: z.string().regex(moneyPattern),
  method: z.enum(["DEMO_UPI", "DEMO_CARD"]), paymentStatus: z.literal("DEMO_PAID"), demo: z.literal(true),
  items: z.array(z.object({ productId: z.string().max(64), name: z.string().max(200), sku: z.string().max(64), imageSrc: z.string().max(200).nullable(), imageAlt: z.string().max(300).nullable(), quantity: z.number().int().min(1).max(99), unitPrice: z.string().regex(moneyPattern), lineTotal: z.string().regex(moneyPattern) })).max(50),
}).strict();
export type DemoOrder = z.infer<typeof demoOrderSchema>;
export const MAX_STORED_ORDERS = 25;

export function parseOrders(raw: string): DemoOrder[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    // Keep every record that still validates; one corrupt entry must not hide the others.
    return list.flatMap(entry => { const parsed = demoOrderSchema.safeParse(entry); return parsed.success ? [parsed.data] : []; });
  } catch { return []; }
}
export const serializeOrders = (orders: DemoOrder[]) => JSON.stringify(orders);
/** Newest first; a repeated reference (duplicate submit/retry of the same key) replaces rather than duplicates. */
export function addOrder(orders: DemoOrder[], order: DemoOrder) {
  return [order, ...orders.filter(o => o.ref !== order.ref)].slice(0, MAX_STORED_ORDERS);
}
export const paymentLabel = (method: DemoOrder["method"]) => (method === "DEMO_UPI" ? "Demo UPI" : "Demo Card");
