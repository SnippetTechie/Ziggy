/**
 * The ONE implementation of the low-stock rule (PRD §7, doc 03):
 *
 *   low stock  <=>  quantity_on_hand <= effective threshold
 *   effective threshold = product.low_stock_threshold ?? workspace default
 *
 * "Out of stock" is quantity 0 and is reported distinctly from "Low stock"
 * (above 0 but at/below the threshold). Comparisons use decimal.js so
 * fractional quantities like 0.1 + 0.2 never suffer floating-point error.
 *
 * Owner per TEAM_HANDOFF.md §7: Teammate 2 (inventory). Created here because it
 * was not on origin/main when the dashboard work started; keep the exports and
 * semantics stable when taking it over.
 */
import Decimal from "decimal.js";

export type StockStatus = "OUT_OF_STOCK" | "LOW_STOCK" | "IN_STOCK";

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  OUT_OF_STOCK: "Out of stock",
  LOW_STOCK: "Low stock",
  IN_STOCK: "In stock",
};

function toDecimal(value: Decimal.Value, label: string): Decimal {
  let d: Decimal;
  try {
    d = new Decimal(value);
  } catch {
    throw new RangeError(`${label} is not a valid decimal`);
  }
  if (!d.isFinite()) throw new RangeError(`${label} must be finite`);
  return d;
}

/** Classify a quantity against a threshold. Throws on invalid inputs. */
export function stockStatus(quantityOnHand: Decimal.Value, threshold: Decimal.Value): StockStatus {
  const qty = toDecimal(quantityOnHand, "quantity");
  const thr = toDecimal(threshold, "threshold");
  if (thr.isNegative()) throw new RangeError("threshold must not be negative");
  if (qty.lessThanOrEqualTo(0)) return "OUT_OF_STOCK";
  return qty.lessThanOrEqualTo(thr) ? "LOW_STOCK" : "IN_STOCK";
}

/** True for both Low stock and Out of stock (quantity <= threshold). */
export function isLowStock(quantityOnHand: Decimal.Value, threshold: Decimal.Value): boolean {
  return stockStatus(quantityOnHand, threshold) !== "IN_STOCK";
}

/**
 * Read the workspace default threshold from `workspaces.settings`
 * (`defaultLowStockThreshold`). Missing, negative, or malformed values yield
 * "0" so the rule stays valid. Returned as a decimal string for SQL binding.
 */
export function parseDefaultThreshold(settings: unknown): string {
  if (typeof settings !== "object" || settings === null) return "0";
  const raw = (settings as Record<string, unknown>).defaultLowStockThreshold;
  if (typeof raw !== "number" && typeof raw !== "string") return "0";
  try {
    const d = new Decimal(raw);
    return d.isFinite() && !d.isNegative() ? d.toFixed() : "0";
  } catch {
    return "0";
  }
}

/** Format a numeric(20,6) string for display without trailing zeros. */
export function formatQuantity(value: string | null | undefined): string {
  if (value === null || value === undefined) return "0";
  try {
    return new Decimal(value).toFixed().replace(/\.0+$/, "");
  } catch {
    return "0";
  }
}
