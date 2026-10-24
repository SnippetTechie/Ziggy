import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { db } from "@/server/db";
import type { Access } from "@/server/authorization/access";
import { Card, StatTile, StatusPill } from "@/components/wireframe";
import { EmptyState, ErrorState, InventoryUnavailable } from "@/components/ui/state-cards";
import { STOCK_STATUS_LABEL, formatQuantity, parseDefaultThreshold } from "@/modules/inventory/stock-status";
import { getInventorySummary, getLowStockAlerts } from "@/modules/reports/inventory-reads";
import { formatLocalDateTime } from "@/modules/reports/format";

const ALERT_ROWS = 8;

/**
 * Inventory summary + low-stock alerts, shared by the Staff dashboard and the
 * Admin overview. Server component: queries run on the server for the caller's
 * own workspace, per request (no caching of private data). Counts only —
 * quantities in different units are never added together.
 */
export async function InventoryOverview({ access }: { access: Access }) {
  const defaultThreshold = parseDefaultThreshold(access.workspaceSettings);
  let summary, alerts;
  try {
    [summary, alerts] = await Promise.all([
      getInventorySummary(db, { workspaceId: access.workspaceId, defaultThreshold }),
      getLowStockAlerts(db, { workspaceId: access.workspaceId, defaultThreshold, limit: ALERT_ROWS }),
    ]);
  } catch (error) {
    unstable_rethrow(error);
    console.error("[inventory-overview]", error instanceof Error ? error.message : "unknown error");
    return <ErrorState message="We could not load the inventory summary." />;
  }
  if (!summary.available || !alerts.available) return <InventoryUnavailable />;

  const s = summary.summary;
  const tz = access.workspaceTimezone;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Active products" value={String(s.activeProducts)} hint="Archived products excluded" />
        <StatTile
          label="Low stock"
          value={String(s.lowStock)}
          tone={s.lowStock > 0 ? "warning" : "neutral"}
          hint="At or below threshold"
        />
        <StatTile
          label="Out of stock"
          value={String(s.outOfStock)}
          tone={s.outOfStock > 0 ? "danger" : "neutral"}
          hint="Quantity is zero"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Low-stock alerts">
          {alerts.alerts.length === 0 ? (
            <EmptyState title="No low-stock items" message="Every active product is above its threshold." />
          ) : (
            <>
              <ul className="divide-y divide-hairline-soft">
                {alerts.alerts.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-semibold text-ink">{a.name}</p>
                      <p className="text-caption text-mute">
                        {a.sku} · threshold {formatQuantity(a.threshold)}
                        {a.unitLabel ? ` ${a.unitLabel}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-body-sm font-semibold text-ink">
                        {formatQuantity(a.quantityOnHand)}
                        {a.unitLabel ? ` ${a.unitLabel}` : ""}
                      </span>
                      <StatusPill tone={a.status === "OUT_OF_STOCK" ? "danger" : "warning"}>
                        {STOCK_STATUS_LABEL[a.status]}
                      </StatusPill>
                    </div>
                  </li>
                ))}
              </ul>
              {alerts.total > alerts.alerts.length && (
                <p className="mt-3 text-caption text-mute">
                  Showing {alerts.alerts.length} of {alerts.total}.{" "}
                  <Link href="/inventory?stock=low" className="font-semibold text-ink underline">
                    View all in Inventory
                  </Link>
                </p>
              )}
            </>
          )}
        </Card>

        <Card title="Recent movements">
          {s.recentMovements.length === 0 ? (
            <EmptyState title="No stock movements yet" message="Stock in and stock out will appear here." />
          ) : (
            <ul className="divide-y divide-hairline-soft">
              {s.recentMovements.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold text-ink">{m.productName}</p>
                    <p className="text-caption text-mute">
                      {formatLocalDateTime(m.occurredAt, tz)}
                      {m.actor ? ` · ${m.actor}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-body-sm font-semibold text-ink">
                      {m.movementType === "STOCK_IN" ? "+" : "−"}
                      {formatQuantity(m.quantity)}
                      {m.unitLabel ? ` ${m.unitLabel}` : ""}
                    </span>
                    <StatusPill tone={m.movementType === "STOCK_IN" ? "success" : "neutral"}>
                      {m.movementType === "STOCK_IN" ? "Stock in" : "Stock out"}
                    </StatusPill>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-caption">
            <Link href="/movements" className="font-semibold text-ink underline">
              Open movement history
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
