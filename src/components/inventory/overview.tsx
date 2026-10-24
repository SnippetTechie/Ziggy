"use client";
import Link from "next/link";
import { useRemote, Notice, Loading, Table, Cell, Status, secondaryClass, type PageData, type Product } from "./ui";
import { MovementTable, type Movement } from "./stock";
export { ReportsScreen } from "./reports";

const staffLinks = [
  { href: "/purchasing", label: "Stock in", hint: "Record stock received" },
  { href: "/issues", label: "Stock out", hint: "Record stock issued" },
  { href: "/inventory", label: "Inventory", hint: "Search products and stock" },
  { href: "/movements", label: "Movement history", hint: "Every stock change" },
];
const adminLinks = [
  { href: "/products", label: "Products", hint: "Add, edit, archive" },
  { href: "/categories", label: "Categories", hint: "Group products" },
  { href: "/suppliers", label: "Suppliers", hint: "Who you buy from" },
  { href: "/admin/team", label: "Team & access", hint: "Roles and members" },
  { href: "/reports", label: "Reports", hint: "Stock and movements, CSV" },
];

/**
 * Staff dashboard (/dashboard) and Admin overview (/admin). Counts only: stock
 * quantities in different units are never added together.
 */
export function OverviewScreen({ admin = false }: { admin?: boolean }) {
  const overview = useRemote<{ products: number; low: number; out: number; workspace: string; recent: Movement[] }>("dashboard/summary");
  const alerts = useRemote<PageData<Product> & { total?: number }>("alerts/low-stock?limit=25");
  const links = admin ? [...staffLinks, ...adminLinks] : staffLinks;
  const d = overview.data;
  // The API's `low` counts every product at or below its threshold, zero included; split it so the two states stay distinct.
  const tiles: [string, number | undefined, string][] = [
    ["Active products", d?.products, "Archived products excluded"],
    ["Low stock", d ? d.low - d.out : undefined, "Above zero, at or below threshold"],
    ["Out of stock", d?.out, "Quantity is zero"],
  ];
  const shown = alerts.data?.items.length ?? 0, total = alerts.data?.total ?? shown;
  return <>
    <div><h1 className="text-heading-xl text-ink">{admin ? "Admin overview" : "Dashboard"}</h1><p className="mt-2 text-body-sm text-mute">{d?.workspace ?? "Your workspace"} · live inventory overview</p></div>
    <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{links.map(l => <li key={l.href}><Link href={l.href} className="block h-full rounded-md bg-surface-card p-4 hover:bg-secondary-bg"><span className="block text-body-sm font-bold text-ink">{l.label}</span><span className="block text-caption text-mute">{l.hint}</span></Link></li>)}</ul>
    <Notice error={overview.error || alerts.error} />
    {(overview.error || alerts.error) && <button className={`${secondaryClass} mt-2`} onClick={() => { overview.refresh(); alerts.refresh(); }}>Try again</button>}
    {overview.loading ? <Loading /> : <div className="my-6 grid gap-4 sm:grid-cols-3">{tiles.map(([label, count, hint]) => <div className="rounded-md border border-hairline bg-canvas p-5" key={label}><p className="text-body-sm text-mute">{label}</p><p className="mt-2 text-3xl font-bold text-ink">{count ?? "—"}</p><p className="mt-1 text-caption text-mute">{hint}</p></div>)}</div>}
    <h2 className="mt-8 text-heading-md text-ink">Needs attention</h2>
    <Table headings={["Product", "SKU", "On hand", "Status"]} empty={!alerts.loading && !alerts.error && !alerts.data?.items.length}>{alerts.data?.items.map(p => <tr key={p.id}><Cell><Link className="underline" href={`/inventory/${p.id}`}>{p.name}</Link></Cell><Cell>{p.sku}</Cell><Cell>{p.quantity} {p.unitLabel}</Cell><Cell><Status value={p.stockStatus} /></Cell></tr>)}</Table>
    {total > shown && <p className="mt-3 text-caption text-mute">Showing the {shown} most urgent of {total}. <Link href="/inventory" className="font-semibold underline">Open inventory</Link> to see all.</p>}
    <h2 className="mt-8 text-heading-md text-ink">Recent movements</h2>
    <MovementTable rows={d?.recent ?? []} />
    <p className="mt-3 text-caption"><Link href="/movements" className="font-semibold underline">Open movement history</Link></p>
  </>;
}
