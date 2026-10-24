import { db } from "@/server/db";
import { parseDefaultThreshold } from "@/modules/inventory/stock-status";
import { getInventorySummary } from "@/modules/reports/inventory-reads";
import { privateJson } from "@/server/http/api";
import { withRole } from "@/server/http/guard";
import { inventoryUnavailable } from "@/server/http/validate";

/** Inventory counts and recent movements for the Staff/Admin dashboards. STAFF+. */
export const GET = withRole("STAFF", async (_request, { access, requestId }) => {
  const result = await getInventorySummary(db, {
    workspaceId: access.workspaceId,
    defaultThreshold: parseDefaultThreshold(access.workspaceSettings),
  });
  if (!result.available) return inventoryUnavailable(requestId, result.missing);
  return privateJson({ summary: result.summary, timezone: access.workspaceTimezone });
});
