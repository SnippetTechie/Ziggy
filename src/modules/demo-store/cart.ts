import { z } from "zod";
import { moneyPattern } from "./money";

export const MAX_LINE_QUANTITY = 99;

/** What the browser persists for a cart: selections only. Names, images and totals are re-fetched, never trusted. */
export const cartLineSchema = z.object({ productId: z.string().min(1).max(64), quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY), unitPrice: z.string().regex(moneyPattern) }).strict();
export type CartLine = z.infer<typeof cartLineSchema>;

const clamp = (quantity: number, max: number) => Math.max(1, Math.min(Math.floor(quantity) || 1, max, MAX_LINE_QUANTITY));

export function parseCart(raw: string): CartLine[] {
  if (!raw) return [];
  try {
    const parsed = z.array(cartLineSchema).max(50).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch { return []; }
}
export const serializeCart = (lines: CartLine[]) => JSON.stringify(lines);

export function addLine(lines: CartLine[], line: CartLine, max: number): CartLine[] {
  const existing = lines.find(l => l.productId === line.productId);
  if (!existing) return [...lines, { ...line, quantity: clamp(line.quantity, max) }];
  return lines.map(l => (l === existing ? { ...l, unitPrice: line.unitPrice, quantity: clamp(l.quantity + line.quantity, max) } : l));
}
export const setLineQuantity = (lines: CartLine[], productId: string, quantity: number, max = MAX_LINE_QUANTITY) => lines.map(l => (l.productId === productId ? { ...l, quantity: clamp(quantity, max) } : l));
export const removeLine = (lines: CartLine[], productId: string) => lines.filter(l => l.productId !== productId);
export const setLinePrice = (lines: CartLine[], productId: string, unitPrice: string) => lines.map(l => (l.productId === productId ? { ...l, unitPrice } : l));
export const cartCount = (lines: CartLine[]) => lines.reduce((sum, l) => sum + l.quantity, 0);
