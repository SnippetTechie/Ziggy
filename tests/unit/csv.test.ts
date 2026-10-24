import { describe, expect, it } from "vitest";
import { CSV_BOM, csvCell, csvResponse, csvText, toCsv } from "@/modules/reports/csv";

describe("CSV escaping", () => {
  it("quotes fields containing commas, quotes, and newlines, doubling embedded quotes", () => {
    expect(csvText("plain")).toBe("plain");
    expect(csvText("a,b")).toBe('"a,b"');
    expect(csvText('say "hi"')).toBe('"say ""hi"""');
    expect(csvText("line1\nline2")).toBe('"line1\nline2"');
    expect(csvText("line1\r\nline2")).toBe('"line1\r\nline2"');
  });

  it("keeps unicode product names intact", () => {
    expect(csvText("चावल 5kg")).toBe("चावल 5kg");
  });

  it("renders null/undefined as empty", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });
});

describe("spreadsheet formula injection", () => {
  it.each([
    ["=1+1", "'=1+1"],
    ["+1+1", "'+1+1"],
    ["-2+3", "'-2+3"],
    ["@SUM(A1)", "'@SUM(A1)"],
    ["=HYPERLINK(\"http://evil\",\"x\")", "\"'=HYPERLINK(\"\"http://evil\"\",\"\"x\"\")\""],
    ["\t=cmd", "'\t=cmd"],
    ["\r=cmd", "\"'\r=cmd\""],
    ["  =1+1", "'  =1+1"],
  ])("neutralises %j", (input, expected) => {
    expect(csvText(input)).toBe(expected);
  });

  it("does not alter ordinary text that merely contains these characters", () => {
    expect(csvText("rice = good")).toBe("rice = good");
    expect(csvText("a-b")).toBe("a-b");
    expect(csvText("user@example.com")).toBe("user@example.com");
  });

  it("passes genuine decimals through as numbers but still guards fake numerics", () => {
    expect(csvCell({ numeric: "12.500000" })).toBe("12.500000");
    expect(csvCell({ numeric: "-3" })).toBe("-3");
    expect(csvCell({ numeric: "=1+1" })).toBe("'=1+1");
    expect(csvCell({ numeric: "1e5" })).toBe("1e5"); // not a strict decimal, but no formula start
    expect(csvCell({ numeric: "-5+2" })).toBe("'-5+2");
  });

  it("guards header cells too", () => {
    expect(toCsv(["=evil"], [])).toBe("'=evil\r\n");
  });
});

describe("toCsv / csvResponse", () => {
  it("emits CRLF-terminated rows with a header", () => {
    const csv = toCsv(["SKU", "Name"], [["A1", "Rice, basmati"], ["B2", null]]);
    expect(csv).toBe('SKU,Name\r\nA1,"Rice, basmati"\r\nB2,\r\n');
  });

  it("is a private, non-cacheable attachment with a safe filename and a BOM", async () => {
    const res = csvResponse('../x"; evil.csv', "a\r\n");
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename=".._x___evil.csv"');
    // Response.text() strips a leading BOM when decoding, so inspect raw bytes.
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes)).toBe(CSV_BOM + "a\r\n");
  });
});
