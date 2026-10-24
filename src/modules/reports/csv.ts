/**
 * CSV serialization for report exports.
 *
 * - RFC 4180 quoting: fields containing a comma, quote, CR or LF are wrapped in
 *   double quotes, with embedded quotes doubled. Rows end in CRLF.
 * - Spreadsheet formula injection: a text cell that a spreadsheet could read as
 *   a formula (starts with = + - @, or a tab/CR, ignoring leading spaces) is
 *   prefixed with a single quote so it is displayed as text (OWASP guidance).
 * - Genuine numbers go through `{ numeric }`, which only passes strict decimal
 *   strings through unmodified, so "-5" quantities are not mangled but text
 *   like "-5+2" still is.
 */
export type CsvCell = string | number | null | undefined | { numeric: string };

const FORMULA_START = /^[\t\r\n ]*[=+\-@\t\r]/;
const STRICT_DECIMAL = /^-?\d+(\.\d+)?$/;

export function csvText(value: string): string {
  const guarded = FORMULA_START.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

export function csvCell(cell: CsvCell): string {
  if (cell === null || cell === undefined) return "";
  if (typeof cell === "object") {
    return STRICT_DECIMAL.test(cell.numeric) ? cell.numeric : csvText(cell.numeric);
  }
  if (typeof cell === "number") return Number.isFinite(cell) ? String(cell) : "";
  return csvText(cell);
}

export function toCsv(headers: readonly string[], rows: readonly (readonly CsvCell[])[]): string {
  const lines = [headers.map((h) => csvText(h)).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  return lines.join("\r\n") + "\r\n";
}

/** UTF-8 BOM so Excel opens non-ASCII product names correctly. */
export const CSV_BOM = "﻿";

export function csvResponse(filename: string, body: string): Response {
  return new Response(CSV_BOM + body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^A-Za-z0-9._-]/g, "_")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
