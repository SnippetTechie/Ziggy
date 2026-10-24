import { describe, expect, it } from "vitest";
import { canAccess, destination, mayChangeMember } from "../../src/modules/access/policy";
import { stockStatus, nextQuantity } from "../../src/modules/inventory/stock-status";
import { productInput, productPatch, movementInput } from "../../src/server/validation";

describe("role and redirect policy", () => {
  it("enforces nested permissions for every role", () => {
    for (const [role, user, staff, admin] of [["USER", true, false, false], ["STAFF", true, true, false], ["ADMIN", true, true, true]] as const) {
      expect(canAccess(role, "USER")).toBe(user);
      expect(canAccess(role, "STAFF")).toBe(staff);
      expect(canAccess(role, "ADMIN")).toBe(admin);
    }
  });
  it("keeps redirects local and never elevates roles", () => {
    expect(destination("USER", "admin")).toEqual({ path: "/inventory", denied: true });
    expect(destination("STAFF", "admin").path).toBe("/dashboard");
    expect(destination("ADMIN", "staff").path).toBe("/dashboard");
    expect(destination("ADMIN", "https://evil.test").path).toBe("/inventory");
    expect(destination(null, "admin").path).toBe("/access-required");
  });
  it("preserves the last administrator", () => {
    expect(mayChangeMember("ADMIN", "ACTIVE", "STAFF", "ACTIVE", 1)).toBe(false);
    expect(mayChangeMember("ADMIN", "ACTIVE", "ADMIN", "SUSPENDED", 1)).toBe(false);
    expect(mayChangeMember("ADMIN", "ACTIVE", "STAFF", "ACTIVE", 2)).toBe(true);
  });
});

describe("inventory decimal rules", () => {
  it("handles zero, exact threshold, default threshold and fractional quantities", () => {
    expect(stockStatus("0", "5", "10")).toBe("Out of stock");
    expect(stockStatus("5", "5", "10")).toBe("Low stock");
    expect(stockStatus("10", null, "10")).toBe("Low stock");
    expect(stockStatus("10.000001", null, "10")).toBe("In stock");
    expect(nextQuantity("0.1", "0.2", "STOCK_IN")).toBe("0.300000");
  });
  it("rejects overselling, negatives, NaN and excess precision", () => {
    expect(() => nextQuantity("1", "1.000001", "STOCK_OUT")).toThrow();
    expect(movementInput.safeParse({ productId: crypto.randomUUID(), quantity: "-1", reasonCode: "ISSUE" }).success).toBe(false);
    expect(movementInput.safeParse({ productId: crypto.randomUUID(), quantity: "NaN", reasonCode: "ISSUE" }).success).toBe(false);
    expect(movementInput.safeParse({ productId: crypto.randomUUID(), quantity: "0.0000001", reasonCode: "ISSUE" }).success).toBe(false);
  });
  it("rejects tenant and quantity injection on product edits", () => {
    expect(productInput.safeParse({ name: "Rice", sku: "RICE", workspaceId: crypto.randomUUID() }).success).toBe(false);
    expect(productInput.safeParse({ name: "Rice", sku: "RICE", quantity: "100" }).success).toBe(false);
  });
  it("does not reset omitted fields in a partial product edit", () => {
    expect(productPatch.parse({ name: "Updated name" })).toEqual({ name: "Updated name" });
  });
});
