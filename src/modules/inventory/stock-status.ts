import Decimal from "decimal.js";
import { AppError } from "../../server/errors";
export function stockStatus(quantity: string, threshold: string | null, defaultThreshold: string) {
  const amount = new Decimal(quantity);
  if (amount.isZero()) return "Out of stock";
  return amount.lte(threshold ?? defaultThreshold) ? "Low stock" : "In stock";
}
export function nextQuantity(balance: string, quantity: string, type: "STOCK_IN" | "STOCK_OUT") {
  const amount = new Decimal(quantity);
  if (!amount.isFinite() || !amount.gt(0)) throw new AppError("INVALID_QUANTITY", "Quantity must be greater than zero.");
  const result = type === "STOCK_IN" ? new Decimal(balance).plus(amount) : new Decimal(balance).minus(amount);
  if (result.lt(0)) throw new AppError("INSUFFICIENT_STOCK", "There is not enough stock for this issue.");
  if (result.gte("100000000000000")) throw new AppError("QUANTITY_OVERFLOW", "The resulting stock quantity is too large.");
  return result.toFixed(6);
}
