import { describe, expect, it } from "vitest";
import { formatQuantity, isLowStock, parseDefaultThreshold, stockStatus } from "@/modules/inventory/stock-status";

describe("stockStatus: quantity <= threshold is low", () => {
  it("is LOW_STOCK exactly at the threshold", () => {
    expect(stockStatus("5", "5")).toBe("LOW_STOCK");
  });
  it("is IN_STOCK just above the threshold", () => {
    expect(stockStatus("5.000001", "5")).toBe("IN_STOCK");
  });
  it("is LOW_STOCK just below the threshold", () => {
    expect(stockStatus("4.999999", "5")).toBe("LOW_STOCK");
  });
  it("is OUT_OF_STOCK at zero, distinct from low stock", () => {
    expect(stockStatus("0", "5")).toBe("OUT_OF_STOCK");
    expect(stockStatus("0.000000", "0")).toBe("OUT_OF_STOCK");
  });
  it("treats a negative balance as out of stock rather than throwing", () => {
    expect(stockStatus("-1", "5")).toBe("OUT_OF_STOCK");
  });
  it("with a zero threshold, any positive quantity is in stock", () => {
    expect(stockStatus("0.000001", "0")).toBe("IN_STOCK");
  });
  it("is decimal-safe (no floating-point drift)", () => {
    // 0.1 + 0.2 !== 0.3 in IEEE floats; exact decimals compare equal.
    expect(0.1 + 0.2 <= 0.3).toBe(false);
    expect(stockStatus("0.3", "0.3")).toBe("LOW_STOCK");
    expect(stockStatus("0.300001", "0.3")).toBe("IN_STOCK");
    expect(stockStatus("1000000000000.000001", "1000000000000")).toBe("IN_STOCK");
  });
  it("accepts numbers and numeric strings alike", () => {
    expect(stockStatus(10, 10)).toBe("LOW_STOCK");
    expect(stockStatus("10", 9)).toBe("IN_STOCK");
  });
  it("rejects invalid input instead of guessing", () => {
    expect(() => stockStatus("abc", "5")).toThrow(RangeError);
    expect(() => stockStatus("5", "NaN")).toThrow(RangeError);
    expect(() => stockStatus("5", "-1")).toThrow(RangeError);
    expect(() => stockStatus("Infinity", "5")).toThrow(RangeError);
  });
  it("isLowStock covers both low and out of stock", () => {
    expect(isLowStock("0", "5")).toBe(true);
    expect(isLowStock("5", "5")).toBe(true);
    expect(isLowStock("6", "5")).toBe(false);
  });
});

describe("parseDefaultThreshold (workspace fallback)", () => {
  it("reads numbers and numeric strings", () => {
    expect(parseDefaultThreshold({ defaultLowStockThreshold: 10 })).toBe("10");
    expect(parseDefaultThreshold({ defaultLowStockThreshold: "2.5" })).toBe("2.5");
  });
  it("falls back to 0 for missing, negative, or malformed settings", () => {
    expect(parseDefaultThreshold({})).toBe("0");
    expect(parseDefaultThreshold(null)).toBe("0");
    expect(parseDefaultThreshold("nope")).toBe("0");
    expect(parseDefaultThreshold({ defaultLowStockThreshold: -3 })).toBe("0");
    expect(parseDefaultThreshold({ defaultLowStockThreshold: "abc" })).toBe("0");
    expect(parseDefaultThreshold({ defaultLowStockThreshold: {} })).toBe("0");
  });
});

describe("formatQuantity", () => {
  it("drops trailing zeros without rounding", () => {
    expect(formatQuantity("5.000000")).toBe("5");
    expect(formatQuantity("5.250000")).toBe("5.25");
    expect(formatQuantity("0.000001")).toBe("0.000001");
    expect(formatQuantity(null)).toBe("0");
  });
});
