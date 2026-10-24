import { describe, expect, it } from "vitest";
import { csv } from "../../src/modules/access/api-policy";
import { checkDateRange, isValidDate, isValidTimeZone } from "../../src/modules/reports/date-range";
import { formatLocalDateTime } from "../../src/modules/reports/format";
import { DEFAULT_TIMEZONE, workspaceTimezone } from "../../src/modules/reports/timezone";
import { stockStatus } from "../../src/modules/inventory/stock-status";

describe("CSV export safety", () => {
  it("quotes every field, doubles embedded quotes, and keeps commas/newlines inside the field", () => {
    expect(csv(["a", "b"], [['say "hi"', "x,y"], ["line1\nline2", "ok"]])).toBe('"a","b"\r\n"say ""hi""","x,y"\r\n"line1\nline2","ok"');
  });
  it.each([
    ["=1+1", "'=1+1"],
    ["+1", "'+1"],
    ["-2+3", "'-2+3"],
    ["@SUM(A1)", "'@SUM(A1)"],
    ["\t=cmd", "'\t=cmd"],
    ["  =1+1", "'  =1+1"], // leading spaces do not hide a formula
    ["\r=cmd", "'\r=cmd"],
  ])("neutralises the formula payload %j", (input, expected) => {
    expect(csv(["x"], [[input]]).split("\r\n")[1]).toBe(`"${expected}"`);
  });
  it("leaves ordinary text and plain numbers alone", () => {
    const rows = csv(["x"], [["rice = good"], ["user@example.com"], ["a-b"], [12.5], [null], [undefined]]).split("\r\n").slice(1);
    expect(rows).toEqual(['"rice = good"', '"user@example.com"', '"a-b"', '"12.5"', '""', '""']);
  });
  it("writes dates as ISO instants instead of locale strings", () => {
    expect(csv(["d"], [[new Date("2026-10-01T18:30:00.000Z")]]).split("\r\n")[1]).toBe('"2026-10-01T18:30:00.000Z"');
  });
});

describe("report dates are whole days in the workspace timezone", () => {
  it("accepts only real calendar dates and from <= to", () => {
    expect(isValidDate("2028-02-29")).toBe(true);
    for (const bad of ["2026-02-29", "2026-13-01", "26-10-24", "2026-10-24T00:00:00Z", "'; drop table x;--"]) expect(isValidDate(bad)).toBe(false);
    expect(checkDateRange("2026-10-02", "2026-10-02")).toEqual({ ok: true });
    expect(checkDateRange("2026-10-03", "2026-10-02").ok).toBe(false);
  });
  it("falls back to Asia/Kolkata for a missing or invalid workspace timezone", () => {
    expect(workspaceTimezone({ defaultLowStockThreshold: "10" })).toBe(DEFAULT_TIMEZONE);
    expect(workspaceTimezone({ timezone: "Not/AZone" })).toBe(DEFAULT_TIMEZONE);
    expect(workspaceTimezone(null)).toBe(DEFAULT_TIMEZONE);
    expect(workspaceTimezone({ timezone: "America/New_York" })).toBe("America/New_York");
    expect(isValidTimeZone("Asia/Kolkata")).toBe(true);
  });
  it("renders the local wall-clock time for an instant (IST is UTC+5:30)", () => {
    expect(formatLocalDateTime("2026-10-01T18:30:00.000Z", "Asia/Kolkata")).toBe("2026-10-02 00:00");
    expect(formatLocalDateTime("2026-10-01T18:29:59.000Z", "Asia/Kolkata")).toBe("2026-10-01 23:59");
  });
});

describe("low-stock rule (quantity <= threshold, decimal-exact)", () => {
  it("is exact at and around the boundary, including the workspace default", () => {
    expect(stockStatus("5", "5", "10")).toBe("Low stock");
    expect(stockStatus("5.000001", "5", "10")).toBe("In stock");
    expect(stockStatus("0.3", "0.3", "10")).toBe("Low stock");
    expect(stockStatus("0.300001", "0.3", "10")).toBe("In stock");
    expect(stockStatus("10", null, "10")).toBe("Low stock");
    expect(stockStatus("10.000001", null, "10")).toBe("In stock");
  });
  it("keeps Out of stock distinct from Low stock", () => {
    expect(stockStatus("0", "5", "10")).toBe("Out of stock");
    expect(stockStatus("0.000000", "0", "10")).toBe("Out of stock");
    expect(stockStatus("0.5", "0", "10")).toBe("In stock");
  });
});
