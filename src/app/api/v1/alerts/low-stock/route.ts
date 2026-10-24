import { z } from "zod";
import { db } from "@/server/db";
import { parseDefaultThreshold } from "@/modules/inventory/stock-status";
import { getLowStockAlerts, MAX_PAGE_SIZE } from "@/modules/reports/inventory-reads";
import { privateJson } from "@/server/http/api";
import { withRole } from "@/server/http/guard";
import { inventoryUnavailable, parseWith, queryObject } from "@/server/http/validate";

const query = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(50),
});

/**
 * Active products where quantity_on_hand <= threshold (product threshold, else
 * workspace default), including products with no balance row. STAFF+.
 */
export const GET = withRole("STAFF", async (request, { access, requestId }) => {
  const parsed = parseWith(query, queryObject(request), requestId);
  if (!parsed.ok) return parsed.response;

  const result = await getLowStockAlerts(db, {
    workspaceId: access.workspaceId,
    defaultThreshold: parseDefaultThreshold(access.workspaceSettings),
    limit: parsed.data.limit,
  });
  if (!result.available) return inventoryUnavailable(requestId, result.missing);
  return privateJson({ alerts: result.alerts, total: result.total });
});
