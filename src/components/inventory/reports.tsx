"use client";
import { Download } from "lucide-react";
import { useState } from "react";
import { useRemote, Field, Notice, Table, Cell, Status, Loading, inputClass, secondaryClass, type PageData, type Product } from "./ui";
import { MovementTable, type Movement } from "./stock";

const PAGE = 50;

/** Retry affordance for a failed report request. */
function Retry({ error, onRetry }: { error: string; onRetry: () => void }) {
  return error ? <div className="my-4"><Notice error={error} /><button className={secondaryClass} onClick={onRetry}>Try again</button></div> : null;
}

/** Export link: the same filters as the screen, but never the page cursor — the CSV holds every matching record (up to 10,000). */
function ExportLink({ path, filters }: { path: string; filters: Record<string, string> }) {
  const href = `/api/v1/reports/${path}?${new URLSearchParams({ ...filters, format: "csv" })}`;
  return <a download href={href} className={secondaryClass}><Download className="mr-2 size-4" aria-hidden />Export CSV</a>;
}

/**
 * Admin reports. Data and CSV come from the ADMIN-only /api/v1/reports/*
 * endpoints, scoped to the caller's workspace on the server.
 */
export function ReportsScreen() {
  const [tab, setTab] = useState<"stock" | "movements">("stock");
  return <>
    <h1 className="text-heading-xl text-ink">Reports</h1>
    <p className="mt-2 text-body-sm text-mute">Current stock and every stock movement. Filter, then export exactly what you see as CSV.</p>
    <div role="tablist" aria-label="Report" className="mt-5 inline-flex gap-1 rounded-md bg-secondary-bg p-1">
      {(["stock", "movements"] as const).map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-sm px-4 py-2 text-body-sm font-bold ${tab === t ? "bg-ink text-on-dark" : "text-ink"}`}>{t === "stock" ? "Stock summary" : "Movements"}</button>)}
    </div>
    {tab === "stock" ? <StockReport /> : <MovementReport />}
  </>;
}

function StockReport() {
  const [search, setSearch] = useState(""), [stock, setStock] = useState("all"), [cursor, setCursor] = useState("");
  const filters: Record<string, string> = { stock, ...(search.trim() ? { search: search.trim() } : {}) };
  const resource = useRemote<PageData<Product>>(`reports/stock-summary?${new URLSearchParams({ ...filters, limit: String(PAGE), ...(cursor ? { cursor } : {}) })}`);
  return <section aria-label="Stock summary report" className="mt-5">
    <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
      <Field label="Search"><input className={inputClass} type="search" value={search} placeholder="Product name or SKU" onChange={e => { setSearch(e.target.value); setCursor(""); }} /></Field>
      <Field label="Stock status"><select className={inputClass} value={stock} onChange={e => { setStock(e.target.value); setCursor(""); }}><option value="all">All stock</option><option value="in">In stock</option><option value="low">Low stock (including zero)</option><option value="out">Out of stock</option></select></Field>
      <ExportLink path="stock-summary" filters={filters} />
    </div>
    <Retry error={resource.error} onRetry={resource.refresh} />
    {resource.loading ? <Loading /> : !resource.error && <Table headings={["Product", "SKU", "Category", "Quantity", "Unit", "Status"]} empty={!resource.data?.items.length}>{resource.data?.items.map(p => <tr key={p.id}><Cell>{p.name}</Cell><Cell>{p.sku}</Cell><Cell>{p.category ?? "Uncategorized"}</Cell><Cell>{p.quantity}</Cell><Cell>{p.unitLabel}</Cell><Cell><Status value={p.stockStatus} /></Cell></tr>)}</Table>}
    <div className="mt-4 flex items-center gap-3">{cursor && <button className={secondaryClass} onClick={() => setCursor("")}>First page</button>}{resource.data?.nextCursor && <button className={secondaryClass} onClick={() => setCursor(resource.data!.nextCursor!)}>Next page</button>}<span className="text-caption text-mute">The CSV includes every matching product, not only this page.</span></div>
  </section>;
}

function MovementReport() {
  const [type, setType] = useState(""), [from, setFrom] = useState(""), [to, setTo] = useState(""), [cursor, setCursor] = useState("");
  const filters: Record<string, string> = { ...(type ? { type } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}) };
  const invalidRange = from !== "" && to !== "" && from > to;
  const resource = useRemote<PageData<Movement>>(`reports/movements?${new URLSearchParams({ ...(invalidRange ? {} : filters), limit: String(PAGE), ...(cursor ? { cursor } : {}) })}`);
  return <section aria-label="Movement report" className="mt-5">
    <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
      <Field label="Type"><select className={inputClass} value={type} onChange={e => { setType(e.target.value); setCursor(""); }}><option value="">All movements</option><option value="STOCK_IN">Stock in</option><option value="STOCK_OUT">Stock out</option></select></Field>
      <Field label="From date"><input className={inputClass} type="date" value={from} onChange={e => { setFrom(e.target.value); setCursor(""); }} /></Field>
      <Field label="To date"><input className={inputClass} type="date" value={to} onChange={e => { setTo(e.target.value); setCursor(""); }} /></Field>
      {!invalidRange && <ExportLink path="movements" filters={filters} />}
    </div>
    <p className="mt-2 text-caption text-mute">Dates are whole days in the workspace timezone; both the From and To days are included.</p>
    {invalidRange && <Notice error="“From” must not be after “To”." />}
    {!invalidRange && <Retry error={resource.error} onRetry={resource.refresh} />}
    {!invalidRange && (resource.loading ? <Loading /> : !resource.error && <MovementTable rows={resource.data?.items ?? []} />)}
    <div className="mt-4 flex items-center gap-3">{cursor && <button className={secondaryClass} onClick={() => setCursor("")}>First page</button>}{resource.data?.nextCursor && <button className={secondaryClass} onClick={() => setCursor(resource.data!.nextCursor!)}>Next page</button>}<span className="text-caption text-mute">The CSV includes every matching movement, not only this page.</span></div>
  </section>;
}
