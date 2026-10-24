"use client";

import { Download } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/state-cards";
import { StatusPill } from "@/components/wireframe";
import { STOCK_STATUS_LABEL, formatQuantity, type StockStatus } from "@/modules/inventory/stock-status";
import { formatLocalDateTime } from "@/modules/reports/format";

type Tab = "stock" | "movements";
const PAGE = 25;

type StockRow = {
  id: string;
  sku: string;
  name: string;
  unitLabel: string | null;
  categoryName: string | null;
  quantityOnHand: string;
  threshold: string;
  status: StockStatus;
};
type MovementRow = {
  id: string;
  occurredAt: string;
  movementType: string;
  reasonCode: string;
  quantity: string;
  productName: string;
  sku: string;
  unitLabel: string | null;
  balanceAfter: string | null;
  supplierName: string | null;
  reference: string | null;
  actor: string | null;
};

type Loaded<T> = { rows: T[]; total: number };
type Fetched<T> =
  | { state: "loading" }
  | { state: "unavailable" }
  | { state: "error"; message: string }
  | ({ state: "ready" } & Loaded<T>);

const field = "h-10 rounded-md border border-hairline bg-canvas px-3 text-body-sm text-ink";

/**
 * Admin reports UI. Data and CSV both come from the ADMIN-guarded
 * /api/v1/reports/* endpoints; this component never queries the database.
 * "Export CSV" downloads EVERY row matching the filters, not just this page.
 */
export function ReportsClient({ timezone }: { timezone: string }) {
  const [tab, setTab] = useState<Tab>("stock");
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Report" className="inline-flex gap-1 rounded-md bg-secondary-bg p-1">
        {(["stock", "movements"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-sm px-4 py-2 text-body-sm font-bold ${tab === t ? "bg-ink text-on-dark" : "text-ink"}`}
          >
            {t === "stock" ? "Stock summary" : "Movements"}
          </button>
        ))}
      </div>
      {tab === "stock" ? <StockReport /> : <MovementReport timezone={timezone} />}
    </div>
  );
}

async function load<T>(url: string, signal: AbortSignal): Promise<Fetched<T>> {
  try {
    const res = await fetch(url, { signal, cache: "no-store" });
    if (res.status === 503) return { state: "unavailable" };
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      return { state: "error", message: body?.error?.message ?? "We could not load this report." };
    }
    const body = (await res.json()) as Loaded<T>;
    return { state: "ready", rows: body.rows, total: body.total };
  } catch (e) {
    if ((e as Error).name === "AbortError") return { state: "loading" };
    return { state: "error", message: "We could not reach the server." };
  }
}

function useReport<T>(path: string, params: Record<string, string>, page: number) {
  const [result, setResult] = useState<Fetched<T>>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify(params);

  useEffect(() => {
    const controller = new AbortController();
    const qs = new URLSearchParams({ ...JSON.parse(key), limit: String(PAGE), offset: String(page * PAGE) });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset to loading before each fetch
    setResult({ state: "loading" });
    load<T>(`${path}?${qs}`, controller.signal).then((r) => {
      if (!controller.signal.aborted) setResult(r);
    });
    return () => controller.abort();
  }, [path, key, page, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { result, retry };
}

function exportHref(path: string, params: Record<string, string>) {
  return `${path}?${new URLSearchParams({ ...params, format: "csv" })}`;
}

function Pager({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE));
  return (
    <div className="flex items-center justify-between gap-3 text-body-sm text-mute">
      <span>
        {total === 0 ? "0 results" : `${page * PAGE + 1}–${Math.min((page + 1) * PAGE, total)} of ${total}`}
      </span>
      <span className="flex gap-2">
        <button disabled={page === 0} onClick={() => onPage(page - 1)} className="h-9 rounded-md bg-secondary-bg px-3 font-bold text-ink disabled:opacity-40">
          Previous
        </button>
        <button disabled={page + 1 >= pages} onClick={() => onPage(page + 1)} className="h-9 rounded-md bg-secondary-bg px-3 font-bold text-ink disabled:opacity-40">
          Next
        </button>
      </span>
    </div>
  );
}

function ExportButton({ href, total }: { href: string; total: number | null }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <a href={href} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-body-sm font-bold text-on-primary">
        <Download className="size-4" aria-hidden />
        Export CSV
      </a>
      <span className="text-caption text-mute">
        {total === null ? "Exports every matching row" : `Exports all ${total} matching rows, not just this page`}
      </span>
    </div>
  );
}

function StockReport() {
  const [search, setSearch] = useState("");
  const [stock, setStock] = useState("all");
  const [page, setPage] = useState(0);
  const params: Record<string, string> = { stock, ...(search.trim() ? { search: search.trim() } : {}) };
  const { result, retry } = useReport<StockRow>("/api/v1/reports/stock-summary", params, page);

  return (
    <section className="space-y-4" aria-label="Stock summary report">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <label className="text-caption font-semibold text-mute">
            Search
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Product or SKU"
              className={`${field} mt-1 block w-56`}
            />
          </label>
          <label className="text-caption font-semibold text-mute">
            Stock
            <select value={stock} onChange={(e) => { setStock(e.target.value); setPage(0); }} className={`${field} mt-1 block`}>
              <option value="all">All</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
              <option value="in">In stock</option>
            </select>
          </label>
        </div>
        <ExportButton href={exportHref("/api/v1/reports/stock-summary", params)} total={result.state === "ready" ? result.total : null} />
      </div>

      {result.state === "loading" && <LoadingBlock label="Loading stock summary" />}
      {result.state === "unavailable" && <EmptyState title="Inventory data is not available yet" message="Reports will appear once products and stock records exist." />}
      {result.state === "error" && <ErrorState message={result.message} onRetry={retry} />}
      {result.state === "ready" && (
        result.rows.length === 0 ? (
          <EmptyState title="No products match" message="Try a different search or stock filter." />
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border border-hairline bg-canvas">
              <table className="w-full text-left text-body-sm">
                <thead className="border-b border-hairline bg-surface-soft text-mute">
                  <tr>
                    {["SKU", "Product", "Category", "Status"].map((h) => <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}
                    {["On hand", "Threshold"].map((h) => <th key={h} scope="col" className="px-4 py-3 text-right font-semibold">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => (
                    <tr key={r.id} className="border-b border-hairline-soft last:border-0">
                      <td className="px-4 py-3 text-mute">{r.sku}</td>
                      <td className="px-4 py-3 font-semibold text-ink">{r.name}</td>
                      <td className="px-4 py-3 text-mute">{r.categoryName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <StatusPill tone={r.status === "OUT_OF_STOCK" ? "danger" : r.status === "LOW_STOCK" ? "warning" : "success"}>
                          {STOCK_STATUS_LABEL[r.status]}
                        </StatusPill>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-ink">{formatQuantity(r.quantityOnHand)}{r.unitLabel ? ` ${r.unitLabel}` : ""}</td>
                      <td className="px-4 py-3 text-right text-mute">{formatQuantity(r.threshold)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} total={result.total} onPage={setPage} />
          </>
        )
      )}
    </section>
  );
}

function MovementReport({ timezone }: { timezone: string }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const rangeInvalid = from !== "" && to !== "" && from > to;
  const params: Record<string, string> = {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(type ? { type } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
  };
  const { result, retry } = useReport<MovementRow>("/api/v1/reports/movements", rangeInvalid ? {} : params, page);

  return (
    <section className="space-y-4" aria-label="Movement report">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <label className="text-caption font-semibold text-mute">
            From
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} className={`${field} mt-1 block`} />
          </label>
          <label className="text-caption font-semibold text-mute">
            To
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} className={`${field} mt-1 block`} />
          </label>
          <label className="text-caption font-semibold text-mute">
            Type
            <select value={type} onChange={(e) => { setType(e.target.value); setPage(0); }} className={`${field} mt-1 block`}>
              <option value="">All</option>
              <option value="STOCK_IN">Stock in</option>
              <option value="STOCK_OUT">Stock out</option>
            </select>
          </label>
          <label className="text-caption font-semibold text-mute">
            Search
            <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Product, SKU, reference" className={`${field} mt-1 block w-56`} />
          </label>
        </div>
        {!rangeInvalid && <ExportButton href={exportHref("/api/v1/reports/movements", params)} total={result.state === "ready" ? result.total : null} />}
      </div>
      <p className="text-caption text-mute">
        Dates are whole days in the workspace timezone ({timezone}); both the From and To days are included.
      </p>

      {rangeInvalid && <ErrorState message="“From” must not be after “To”." onRetry={() => setFrom("")} />}
      {!rangeInvalid && result.state === "loading" && <LoadingBlock label="Loading movements" />}
      {!rangeInvalid && result.state === "unavailable" && <EmptyState title="Inventory data is not available yet" message="Reports will appear once stock movements exist." />}
      {!rangeInvalid && result.state === "error" && <ErrorState message={result.message} onRetry={retry} />}
      {!rangeInvalid && result.state === "ready" && (
        result.rows.length === 0 ? (
          <EmptyState title="No movements in this range" message="Widen the dates or clear the filters." />
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border border-hairline bg-canvas">
              <table className="w-full text-left text-body-sm">
                <thead className="border-b border-hairline bg-surface-soft text-mute">
                  <tr>
                    {["When", "Type", "Product", "Reason", "Reference", "Recorded by"].map((h) => <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}
                    {["Quantity", "Balance after"].map((h) => <th key={h} scope="col" className="px-4 py-3 text-right font-semibold">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => (
                    <tr key={r.id} className="border-b border-hairline-soft last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 text-mute">{formatLocalDateTime(r.occurredAt, timezone)}</td>
                      <td className="px-4 py-3"><StatusPill tone={r.movementType === "STOCK_IN" ? "success" : "neutral"}>{r.movementType === "STOCK_IN" ? "Stock in" : "Stock out"}</StatusPill></td>
                      <td className="px-4 py-3 font-semibold text-ink">{r.productName} <span className="font-normal text-mute">{r.sku}</span></td>
                      <td className="px-4 py-3 text-mute">{r.reasonCode}</td>
                      <td className="px-4 py-3 text-mute">{r.reference ?? "—"}</td>
                      <td className="px-4 py-3 text-mute">{r.actor ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-ink">{r.movementType === "STOCK_IN" ? "+" : "−"}{formatQuantity(r.quantity)}{r.unitLabel ? ` ${r.unitLabel}` : ""}</td>
                      <td className="px-4 py-3 text-right text-mute">{r.balanceAfter === null ? "—" : formatQuantity(r.balanceAfter)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} total={result.total} onPage={setPage} />
          </>
        )
      )}
    </section>
  );
}
