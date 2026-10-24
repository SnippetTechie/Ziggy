import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import type { z } from "zod";
import type { Access } from "../access/policy";
import { db, type Transaction } from "../../server/db";
import { balances, idempotencyKeys, movements, products, suppliers } from "../../server/db/schema";
import { ensure } from "../../server/errors";
import { inReasons, outReasons, movementInput, keyInput } from "../../server/validation";
import { audit, checkActor } from "../../server/services/shared";
import { nextQuantity } from "./stock-status";
type MovementInput = z.infer<typeof movementInput>;
export async function postStock(access: Access, input: MovementInput, type: "STOCK_IN" | "STOCK_OUT", key: string) {
  const parsed = movementInput.parse(input);
  keyInput.parse(key);
  return db.transaction(tx => postStockInTransaction(tx, access, parsed, type, key));
}
export async function postStockInTransaction(tx: Transaction, access: Access, input: MovementInput, type: "STOCK_IN" | "STOCK_OUT", key: string) {
  await checkActor(tx, access, "STAFF");
  ensure((type === "STOCK_IN" ? [...inReasons] : [...outReasons]).some(reason => reason === input.reasonCode), "INVALID_REASON", "Choose a valid reason for this movement type.");
  ensure(type === "STOCK_IN" || (!input.supplierId && !input.unitCost), "INVALID_ISSUE", "Supplier and purchase cost apply only to stock in.");
  const requestHash = createHash("sha256").update(JSON.stringify({ type, ...input })).digest("hex");
  // Serialize a key before reading it; protects retries even before any balance exists.
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${access.workspaceId + ":" + key}, 0))`);
  const [prior] = await tx.select().from(idempotencyKeys).where(and(eq(idempotencyKeys.workspaceId, access.workspaceId), eq(idempotencyKeys.key, key)));
  if (prior) {
    ensure(prior.requestHash === requestHash && prior.userId === access.userId && prior.operation === type, "IDEMPOTENCY_CONFLICT", "This submission key was already used for a different request.", 409);
    return prior.responseBody;
  }
  const [product] = await tx.select().from(products).where(and(eq(products.workspaceId, access.workspaceId), eq(products.id, input.productId))).for("update");
  ensure(product?.isActive, "PRODUCT_NOT_FOUND", "Choose an active product in this workspace.", 404);
  if (input.supplierId) {
    const [supplier] = await tx.select().from(suppliers).where(and(eq(suppliers.workspaceId, access.workspaceId), eq(suppliers.id, input.supplierId))).for("share");
    ensure(supplier?.isActive, "SUPPLIER_NOT_FOUND", "Choose an active supplier in this workspace.", 404);
  }
  await tx.insert(balances).values({ workspaceId: access.workspaceId, locationId: access.locationId, productId: input.productId }).onConflictDoNothing();
  const condition = and(eq(balances.workspaceId, access.workspaceId), eq(balances.locationId, access.locationId), eq(balances.productId, input.productId));
  const [balance] = await tx.select().from(balances).where(condition).for("update");
  ensure(balance, "BALANCE_NOT_FOUND", "The product balance could not be found.", 409);
  const balanceAfter = nextQuantity(balance.quantityOnHand, input.quantity, type);
  await tx.update(balances).set({ quantityOnHand: balanceAfter, updatedAt: new Date() }).where(condition);
  const [movement] = await tx.insert(movements).values({ ...input, workspaceId: access.workspaceId, locationId: access.locationId, movementType: type, balanceAfter, idempotencyKey: key, createdBy: access.userId }).returning();
  await tx.insert(idempotencyKeys).values({ workspaceId: access.workspaceId, userId: access.userId, key, operation: type, requestHash, movementId: movement.id, responseBody: movement });
  await audit(tx, access, type, "stock_movement", movement.id, { productId: input.productId, quantity: input.quantity, balanceAfter });
  return movement;
}
