import { z } from "zod";
import { db } from "@/server/db";
import { STOCK_STATUS_LABEL, parseDefaultThreshold } from "@/modules/inventory/stock-status";
import { csvResponse, toCsv } from "@/modules/reports/csv";
import { getStockReport, MAX_PAGE_SIZE } from "@/modules/reports/inventory-reads";
import { errorResponse, privateJson } from "@/server/http/api";
import { withRole } from "@/server/http/guard";
import { inventoryUnavailable, parseWith, queryObject } from "@/server/http/validate";

const query = z.object({
  search: z.string().max(100).optional(),
  categoryId: z.uuid().optional(),
  stock: z.enum(["all", "low", "out", "in"]).default("all"),
  sort: z.enum(["name", "sku", "quantity", "status"]).default("name"),
  dir: z.enum(["asc", "desc"]).default("asc"),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  format: z.enum(["json", "csv"]).default("json"),
});

/**
 * Stock summary report. ADMIN only. `format=csv` exports EVERY matching row
 * (ignoring limit/offset), not just the visible page.
 */
export const GET = withRole("ADMIN", async (request, { access, requestId }) => {
  const parsed = parseWith(query, queryObject(request), requestId);
  if (!parsed.ok) return parsed.response;
  const q = parsed.data;
  const base = {
    workspaceId: access.workspaceId,
    defaultThreshold: parseDefaultThreshold(access.workspaceSettings),
    search: q.search,
    categoryId: q.categoryId,
    stock: q.stock,
    sort: q.sort,
    direction: q.dir,
  };

  if (q.format === "csv") {
    const result = await getStockReport(db, base); // no limit => full export
    if (!result.available) return inventoryUnavailable(requestId, result.missing);
    if (result.truncated) {
      return errorResponse(413, "EXPORT_TOO_LARGE", "Too many rows to export. Narrow the filters and try again.", requestId);
    }
    const csv = toCsv(
      ["SKU", "Product", "Category", "Unit", "Quantity on hand", "Low-stock threshold", "Status"],
      result.rows.map((r) => [
        r.sku,
        r.name,
        r.categoryName,
        r.unitLabel,
        { numeric: r.quantityOnHand },
        { numeric: r.threshold },
        STOCK_STATUS_LABEL[r.status],
      ]),
    );
    return csvResponse(`stock-summary-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  const result = await getStockReport(db, { ...base, limit: q.limit, offset: q.offset });
  if (!result.available) return inventoryUnavailable(requestId, result.missing);
  return privateJson({ rows: result.rows, total: result.total, limit: q.limit, offset: q.offset });
});
