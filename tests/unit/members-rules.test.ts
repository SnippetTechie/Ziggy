import { describe, expect, it } from "vitest";
import { wouldRemoveLastAdmin } from "@/modules/access/members";
import { checkDateRange, isValidDate, isValidTimeZone } from "@/modules/reports/date-range";
import { escapeLike } from "@/modules/reports/inventory-reads";
import { formatLocalDateTime } from "@/modules/reports/format";

const adminActive = { role: "ADMIN", status: "ACTIVE" };

describe("last-admin protection", () => {
  it("blocks demoting or suspending the only active admin", () => {
    expect(wouldRemoveLastAdmin(adminActive, { role: "STAFF", status: "ACTIVE" }, 1)).toBe(true);
    expect(wouldRemoveLastAdmin(adminActive, { role: "ADMIN", status: "SUSPENDED" }, 1)).toBe(true);
    expect(wouldRemoveLastAdmin(adminActive, { role: "USER", status: "SUSPENDED" }, 1)).toBe(true);
  });
  it("allows it when another active admin remains", () => {
    expect(wouldRemoveLastAdmin(adminActive, { role: "STAFF", status: "ACTIVE" }, 2)).toBe(false);
  });
  it("does not care about changes that keep the admin active", () => {
    expect(wouldRemoveLastAdmin(adminActive, adminActive, 1)).toBe(false);
  });
  it("does not apply to non-admins or already-suspended admins", () => {
    expect(wouldRemoveLastAdmin({ role: "STAFF", status: "ACTIVE" }, { role: "USER", status: "SUSPENDED" }, 1)).toBe(false);
    expect(wouldRemoveLastAdmin({ role: "ADMIN", status: "SUSPENDED" }, { role: "STAFF", status: "SUSPENDED" }, 1)).toBe(false);
  });
});

describe("report date range validation", () => {
  it("accepts real calendar dates only", () => {
    expect(isValidDate("2026-10-24")).toBe(true);
    expect(isValidDate("2028-02-29")).toBe(true);
    expect(isValidDate("2026-02-29")).toBe(false);
    expect(isValidDate("2026-13-01")).toBe(false);
    expect(isValidDate("2026-1-1")).toBe(false);
    expect(isValidDate("26-10-24")).toBe(false);
    expect(isValidDate("2026-10-24T00:00:00Z")).toBe(false);
    expect(isValidDate("'; drop table x;--")).toBe(false);
  });
  it("requires from <= to, allowing a single-day range", () => {
    expect(checkDateRange("2026-10-02", "2026-10-02")).toEqual({ ok: true });
    expect(checkDateRange("2026-10-03", "2026-10-02").ok).toBe(false);
    expect(checkDateRange(undefined, "2026-10-02")).toEqual({ ok: true });
    expect(checkDateRange("nope", undefined).ok).toBe(false);
  });
  it("validates IANA time zones", () => {
    expect(isValidTimeZone("Asia/Kolkata")).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
  });
  it("formats instants in the workspace timezone", () => {
    // 18:30Z is midnight of the NEXT day in IST (UTC+5:30).
    expect(formatLocalDateTime("2026-10-01T18:30:00.000Z", "Asia/Kolkata")).toBe("2026-10-02 00:00");
    expect(formatLocalDateTime("2026-10-01T18:29:59.000Z", "Asia/Kolkata")).toBe("2026-10-01 23:59");
  });
});

describe("LIKE search escaping", () => {
  it("escapes wildcard characters so user input cannot widen a search", () => {
    expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
    expect(escapeLike("plain")).toBe("plain");
  });
});
