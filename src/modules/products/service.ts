import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import Decimal from "decimal.js";
import type { Access } from "../access/policy";
import { db } from "../../server/db";
import { balances, categories, products, movements, suppliers } from "../../server/db/schema";
import { ensure } from "../../server/errors";
import { productInput, productPatch, categoryInput, supplierInput } from "../../server/validation";
import { audit, checkActor } from "../../server/services/shared";
import { postStockInTransaction } from "../inventory/service";
export async function saveProduct(access: Access, raw: z.input<typeof productInput> | z.input<typeof productPatch>, id?: string) {
  const input = id ? productPatch.parse(raw) : productInput.parse(raw);
  return db.transaction(async tx => {
    await checkActor(tx, access, "ADMIN");
    if (input.categoryId) {
      const [category] = await tx.select().from(categories).where(and(eq(categories.id, input.categoryId), eq(categories.workspaceId, access.workspaceId))).for("share");
      ensure(category, "CATEGORY_NOT_FOUND", "Choose a category in this workspace.", 404);
    }
    const { openingQuantity, ...values } = input as z.infer<typeof productInput>;
    let product;
    if (id) {
      [product] = await tx.update(products).set(values).where(and(eq(products.id, id), eq(products.workspaceId, access.workspaceId))).returning();
    } else {
      [product] = await tx.insert(products).values({ ...values, workspaceId: access.workspaceId }).returning();
      await tx.insert(balances).values({ workspaceId: access.workspaceId, locationId: access.locationId, productId: product.id });
      if (openingQuantity && new Decimal(openingQuantity).gt(0)) await postStockInTransaction(tx, access, { productId: product.id, quantity: openingQuantity, reasonCode: "OPENING_STOCK", supplierId: null, unitCost: null, reference: "", note: "Opening stock at product creation" }, "STOCK_IN", `opening:${product.id}`);
    }
    ensure(product, "NOT_FOUND", "Product not found.", 404);
    await audit(tx, access, id ? "PRODUCT_UPDATED" : "PRODUCT_CREATED", "product", product.id);
    return product;
  });
}
export async function productAction(access: Access, id: string, action: "delete" | "deactivate" | "reactivate") {
  return db.transaction(async tx => {
    await checkActor(tx, access, "ADMIN");
    const condition = and(eq(products.id, id), eq(products.workspaceId, access.workspaceId));
    const [product] = await tx.select().from(products).where(condition).for("update");
    ensure(product, "NOT_FOUND", "Product not found.", 404);
    if (action === "delete") {
      const [history] = await tx.select({ id: movements.id }).from(movements).where(and(eq(movements.productId, id), eq(movements.workspaceId, access.workspaceId))).limit(1);
      ensure(!history, "PRODUCT_HAS_HISTORY", "This product has stock history. Archive it instead.", 409);
      await tx.delete(balances).where(and(eq(balances.productId, id), eq(balances.workspaceId, access.workspaceId)));
      await tx.delete(products).where(condition);
    } else await tx.update(products).set({ isActive: action === "reactivate" }).where(condition);
    await audit(tx, access, `PRODUCT_${action.toUpperCase()}`, "product", id);
    return { id };
  });
}
export async function saveCategory(access: Access, input: z.infer<typeof categoryInput>, id?: string) {
  return db.transaction(async tx => {
    await checkActor(tx, access, "ADMIN");
    const [row] = id ? await tx.update(categories).set(input).where(and(eq(categories.id, id), eq(categories.workspaceId, access.workspaceId))).returning() : await tx.insert(categories).values({ ...input, workspaceId: access.workspaceId }).returning();
    ensure(row, "NOT_FOUND", "Category not found.", 404);
    await audit(tx, access, id ? "CATEGORY_UPDATED" : "CATEGORY_CREATED", "category", row.id);
    return row;
  });
}
export async function deleteCategory(access: Access, id: string) {
  return db.transaction(async tx => {
    await checkActor(tx, access, "ADMIN");
    const condition = and(eq(categories.id, id), eq(categories.workspaceId, access.workspaceId));
    const [row] = await tx.select().from(categories).where(condition).for("update");
    ensure(row, "NOT_FOUND", "Category not found.", 404);
    const [used] = await tx.select({ id: products.id }).from(products).where(and(eq(products.categoryId, id), eq(products.workspaceId, access.workspaceId))).limit(1);
    ensure(!used, "CATEGORY_IN_USE", "Move products to another category before deleting this one.", 409);
    await tx.delete(categories).where(condition);
    await audit(tx, access, "CATEGORY_DELETED", "category", id);
    return { id };
  });
}
export async function saveSupplier(access: Access, input: z.infer<typeof supplierInput>, id?: string) {
  return db.transaction(async tx => {
    await checkActor(tx, access, "ADMIN");
    const [row] = id ? await tx.update(suppliers).set(input).where(and(eq(suppliers.id, id), eq(suppliers.workspaceId, access.workspaceId))).returning() : await tx.insert(suppliers).values({ ...input, workspaceId: access.workspaceId }).returning();
    ensure(row, "NOT_FOUND", "Supplier not found.", 404);
    await audit(tx, access, id ? "SUPPLIER_UPDATED" : "SUPPLIER_CREATED", "supplier", row.id);
    return row;
  });
}
export async function supplierAction(access: Access, id: string, action: "delete" | "deactivate" | "reactivate") {
  return db.transaction(async tx => {
    await checkActor(tx, access, "ADMIN");
    const condition = and(eq(suppliers.id, id), eq(suppliers.workspaceId, access.workspaceId));
    const [row] = await tx.select().from(suppliers).where(condition).for("update");
    ensure(row, "NOT_FOUND", "Supplier not found.", 404);
    if (action === "delete") {
      const [used] = await tx.select({ id: movements.id }).from(movements).where(and(eq(movements.supplierId, id), eq(movements.workspaceId, access.workspaceId))).limit(1);
      ensure(!used, "SUPPLIER_HAS_HISTORY", "This supplier has stock history. Archive it instead.", 409);
      await tx.delete(suppliers).where(condition);
    } else await tx.update(suppliers).set({ isActive: action === "reactivate" }).where(condition);
    await audit(tx, access, `SUPPLIER_${action.toUpperCase()}`, "supplier", id);
    return { id };
  });
}
