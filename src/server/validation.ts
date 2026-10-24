import { z } from "zod";
import Decimal from "decimal.js";
export const decimalInput = z.string().regex(/^\d{1,14}(\.\d{1,6})?$/, "Use a nonnegative decimal with at most 14 integer digits and 6 decimal places.");
export const positiveInput = decimalInput.refine(v => new Decimal(v).gt(0), "Quantity must be greater than zero.");
export const productInput = z.object({
  sku: z.string().trim().min(1).max(64), name: z.string().trim().min(1).max(180),
  description: z.string().trim().max(2000).default(""), categoryId: z.uuid().nullable().default(null),
  unitLabel: z.string().trim().min(1).max(24).default("pcs"), lowStockThreshold: decimalInput.nullable().default(null),
  openingQuantity: decimalInput.optional(),
}).strict();
export const productPatch = z.object({
  sku: productInput.shape.sku.optional(), name: productInput.shape.name.optional(),
  description: productInput.shape.description.removeDefault().optional(),
  categoryId: productInput.shape.categoryId.removeDefault().optional(),
  unitLabel: productInput.shape.unitLabel.removeDefault().optional(),
  lowStockThreshold: productInput.shape.lowStockThreshold.removeDefault().optional(),
}).strict().refine(v => Object.keys(v).length > 0);
export const categoryInput = z.object({ name: z.string().trim().min(1).max(100) }).strict();
export const supplierInput = z.object({ name: z.string().trim().min(1).max(180), email: z.union([z.email(), z.literal("")]).default(""), phone: z.string().trim().max(40).default(""), address: z.string().trim().max(500).default("") }).strict();
export const inReasons = ["PURCHASE", "OPENING_STOCK", "RETURN_IN", "ADJUSTMENT_IN"] as const;
export const outReasons = ["ISSUE", "USED", "DAMAGED", "LOST", "ADJUSTMENT_OUT"] as const;
export const movementInput = z.object({ productId: z.uuid(), quantity: positiveInput, reasonCode: z.enum([...inReasons, ...outReasons]), supplierId: z.uuid().nullable().default(null), unitCost: decimalInput.nullable().default(null), reference: z.string().trim().max(120).default(""), note: z.string().trim().max(1000).default("") }).strict();
export const memberInput = z.object({ userId: z.uuid(), role: z.enum(["USER", "STAFF", "ADMIN"]), status: z.enum(["ACTIVE", "SUSPENDED"]).default("ACTIVE") }).strict();
export const settingsInput = z.object({ defaultLowStockThreshold: decimalInput }).strict();
export const idInput = z.uuid();
export const keyInput = z.string().min(8).max(128).regex(/^[a-zA-Z0-9_:-]+$/);
