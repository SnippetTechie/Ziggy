import { z } from "zod";
import { db } from "@/server/db";
import { csvResponse, toCsv } from "@/modules/reports/csv";
import { checkDateRange } from "@/modules/reports/date-range";
import { formatLocalDateTime } from "@/modules/reports/format";
import { getMovementReport, MAX_PAGE_SIZE } from "@/modules/reports/inventory-reads";
import { errorResponse, privateJson } from "@/server/http/api";
import { withRole } from "@/server/http/guard";
import { inventoryUnavailable, parseWith, queryObject } from "@/server/http/validate";

const query = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  type: z.enum(["STOCK_IN", "STOCK_OUT"]).optional(),
  productId: z.uuid().optional(),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  format: z.enum(["json", "csv"]).default("json"),
});

/**
 * Movement report. ADMIN only. `from`/`to` are calendar dates in the WORKSPACE
 * timezone, both inclusive of the whole day. `format=csv` exports every
 * matching row, not just the visible page.
 */
export const GET = withRole("ADMIN", async (request, { access, requestId }) => {
  const parsed = parseWith(query, queryObject(request), requestId);
  if (!parsed.ok) return parsed.response;
  const q = parsed.data;

  const range = checkDateRange(q.from, q.to);
  if (!range.ok) return errorResponse(422, "VALIDATION_ERROR", range.message, requestId);

  const base = {
    workspaceId: access.workspaceId,
    timezone: access.workspaceTimezone,
    from: q.from,
    to: q.to,
    type: q.type,
    productId: q.productId,
    search: q.search,
  };

  if (q.format === "csv") {
    const result = await getMovementReport(db, base); // no limit => full export
    if (!result.available) return inventoryUnavailable(requestId, result.missing);
    if (result.truncated) {
      return errorResponse(413, "EXPORT_TOO_LARGE", "Too many rows to export. Narrow the filters and try again.", requestId);
    }
    const tz = access.workspaceTimezone;
    const csv = toCsv(
      [`Date/time (${tz})`, "Date/time (UTC)", "Type", "Reason", "SKU", "Product", "Unit", "Quantity", "Balance after", "Supplier", "Reference", "Note", "Recorded by"],
      result.rows.map((r) => [
        formatLocalDateTime(r.occurredAt, tz),
        r.occurredAt,
        r.movementType === "STOCK_IN" ? "Stock in" : "Stock out",
        r.reasonCode,
        r.sku,
        r.productName,
        r.unitLabel,
        { numeric: r.quantity },
        r.balanceAfter === null ? null : { numeric: r.balanceAfter },
        r.supplierName,
        r.reference,
        r.note,
        r.actor,
      ]),
    );
    return csvResponse(`movements-${q.from ?? "start"}-to-${q.to ?? "today"}.csv`, csv);
  }

  const result = await getMovementReport(db, { ...base, limit: q.limit, offset: q.offset });
  if (!result.available) return inventoryUnavailable(requestId, result.missing);
  return privateJson({
    rows: result.rows,
    total: result.total,
    limit: q.limit,
    offset: q.offset,
    timezone: access.workspaceTimezone,
  });
});
