"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PackageSearch, ReceiptText, ShoppingCart } from "lucide-react";
import { useRemote, Field, inputClass, buttonClass, secondaryClass } from "@/components/inventory/ui";
import type { CatalogCategory, CatalogItem } from "@/modules/demo-store/catalog";
import { formatInr } from "@/modules/demo-store/money";
import { itemCount } from "./orders";
import { paymentLabel } from "@/modules/demo-store/orders";
import { useCart, useDemoOrders } from "./store";
import { Availability, CardSkeleton, DemoBanner, ErrorPanel, Price, ProductImage } from "./parts";
import { RequestTray, requestable, type RequestLine } from "./stock-request";

type CatalogData = { source: "demo" | "live"; items: CatalogItem[]; categories: CatalogCategory[]; total: number };
const sorts = [["name", "Name (A–Z)"], ["price-asc", "Price: low to high"], ["price-desc", "Price: high to low"], ["availability", "Most available"]] as const;

export function UserCatalogue() {
  const [source, setSource] = useState<"demo" | "live">("demo");
  const [searchInput, setSearchInput] = useState(""), [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState(""), [stock, setStock] = useState("all"), [sort, setSort] = useState("name");
  useEffect(() => { const timer = setTimeout(() => setSearch(searchInput.trim()), 250); return () => clearTimeout(timer); }, [searchInput]);
  const query = new URLSearchParams({ source, search, stock, sort, ...(categoryId ? { categoryId } : {}) });
  const catalog = useRemote<CatalogData>(`catalog?${query}`);
  const cart = useCart();
  const [announce, setAnnounce] = useState("");
  const [request, setRequest] = useState<Record<string, RequestLine>>({}); // real-inventory stock request in progress
  const switchSource = (next: "demo" | "live") => { setSource(next); setCategoryId(""); setSearchInput(""); setSearch(""); setStock("all"); setSort("name"); };
  const items = catalog.data?.items ?? [];
  const filtered = !!search || !!categoryId || stock !== "all";

  return <>
    <title>Shop · Ziggy</title>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-heading-xl text-ink">Shop</h1><p className="mt-2 max-w-2xl text-body-sm text-mute">Browse products, check what is in stock and try the simulated checkout.</p></div>
      <Link href="/cart" className={`${secondaryClass} gap-2`}><ShoppingCart className="size-4" aria-hidden />View cart{cart.count > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-caption font-bold text-on-primary">{cart.count}</span>}</Link>
    </div>

    <div role="group" aria-label="Catalog source" className="mt-6 inline-flex rounded-md bg-surface-card p-1">
      {([["demo", "Demo shop"], ["live", "In-store stock"]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={source === value} onClick={() => switchSource(value)} className={`min-h-11 rounded-md px-5 text-body-sm font-semibold ${source === value ? "bg-ink text-on-dark" : "text-charcoal hover:bg-secondary-bg"}`}>{label}</button>)}
    </div>
    <div className="mt-4">{source === "demo"
      ? <DemoBanner>Sample shop. Products, prices and stock here are fictional demo data, separate from the store&rsquo;s real stock. Payment is simulated: no money is charged.</DemoBanner>
      : <p className="rounded-md border border-hairline bg-canvas p-4 text-body-sm text-body">In-store stock is what the store really has. Add items to a <strong>stock request</strong>; the store team confirms and fulfils it. Quantities only: no prices and no payment. Demo purchases never appear here.</p>}</div>

    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Search"><input className={inputClass} type="search" value={searchInput} placeholder="Name, SKU or keyword" onChange={event => setSearchInput(event.target.value)} /></Field>
      <Field label="Category"><select className={inputClass} value={categoryId} onChange={event => setCategoryId(event.target.value)}><option value="">All categories</option>{catalog.data?.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label="Availability"><select className={inputClass} value={stock} onChange={event => setStock(event.target.value)}><option value="all">Show all products</option><option value="available">In stock only</option></select></Field>
      <Field label="Sort by"><select className={inputClass} value={sort} onChange={event => setSort(event.target.value)}>{sorts.filter(([value]) => source === "demo" || !value.startsWith("price")).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
    </div>
    <p role="status" className="sr-only">{announce}</p>
    {catalog.data && <p className="mt-4 text-body-sm text-mute" aria-live="polite">{items.length} {items.length === 1 ? "product" : "products"}{filtered ? ` of ${catalog.data.total}` : ""}</p>}

    {catalog.loading ? <CardSkeleton /> : catalog.error ? <ErrorPanel message={catalog.error} onRetry={catalog.refresh} /> : !items.length ? <EmptyCatalog source={source} filtered={filtered} total={catalog.data?.total ?? 0} onDemo={() => switchSource("demo")} onClear={() => { setSearchInput(""); setCategoryId(""); setStock("all"); }} /> :
      <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{items.map((item, index) => {
        const inCart = cart.lines.find(line => line.productId === item.id)?.quantity ?? 0;
        const canAdd = item.purchasable && !!item.price && inCart < item.maxQuantity;
        return <li key={item.id} className="flex flex-col rounded-md bg-canvas p-3">
          <Link href={`/inventory/${item.id}`} aria-label={`View details for ${item.name}`}><ProductImage src={item.image?.src} alt={item.image?.alt} name={item.name} category={item.category} sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, 46vw" priority={index < 4} /></Link>
          <div className="mt-3 flex flex-1 flex-col gap-2">
            <p className="text-caption text-mute">{item.category ?? "Uncategorized"}</p>
            <h2 className="text-body-md font-semibold text-ink"><Link href={`/inventory/${item.id}`} className="hover:underline">{item.name}</Link></h2>
            {item.source === "demo" && <Price item={item} />}
            <div><Availability status={item.stockStatus} quantity={item.quantity} unit={item.unit} /></div>
            <div className="mt-auto pt-2">
              {item.source === "live" ? (requestable(item) <= 0 ? <button type="button" disabled className={`${secondaryClass} w-full`}>Out of stock</button> : <button type="button" disabled={(request[item.id]?.quantity ?? 0) >= requestable(item)} className={`${buttonClass} w-full`} onClick={() => { setRequest(r => ({ ...r, [item.id]: { item, quantity: Math.min((r[item.id]?.quantity ?? 0) + 1, requestable(item)) } })); setAnnounce(`Added ${item.name} to your stock request.`); }}>{(request[item.id]?.quantity ?? 0) >= requestable(item) ? "Max requested" : "Add to request"}</button>)
                : !item.purchasable ? <button type="button" disabled className={`${secondaryClass} w-full`}>Out of stock</button>
                : <button type="button" disabled={!canAdd} className={`${buttonClass} w-full`} onClick={() => { cart.add({ productId: item.id, quantity: 1, unitPrice: item.price!.amount }, item.maxQuantity); setAnnounce(`Added ${item.name} to your cart.`); }}>{!cart.ready ? "Loading…" : canAdd ? "Add to cart" : "Max in cart"}</button>}
              {inCart > 0 && <p className="mt-2 text-caption text-mute">{inCart} in your cart</p>}
              {item.source === "live" && request[item.id] && <p className="mt-2 text-caption text-mute">{request[item.id].quantity} in your request</p>}
            </div>
          </div>
        </li>;
      })}</ul>}

    {source === "live" && <RequestTray lines={Object.values(request)} onQuantity={(id, quantity) => setRequest(r => r[id] ? { ...r, [id]: { ...r[id], quantity } } : r)} onRemove={id => setRequest(r => Object.fromEntries(Object.entries(r).filter(([key]) => key !== id)))} onPlaced={() => { setRequest({}); catalog.refresh(); }} />}

    {source === "demo" && <RecentOrders />}
  </>;
}

function EmptyCatalog({ source, filtered, total, onDemo, onClear }: { source: string; filtered: boolean; total: number; onDemo: () => void; onClear: () => void }) {
  return <div className="mt-6 rounded-md border border-dashed border-hairline bg-canvas px-6 py-14 text-center"><PackageSearch className="mx-auto size-10 text-mute" aria-hidden />
    <h2 className="mt-3 text-heading-md text-ink">{filtered ? "No products match your filters" : source === "live" ? "Nothing in stock listed yet" : "No products to show"}</h2>
    <p className="mx-auto mt-2 max-w-md text-body-sm text-mute">{filtered ? `Try a different search or clear the filters (${total} products in this catalog).` : source === "live" ? "No products have been added to the store yet. You can try the shopping flow in the demo shop." : "The demo catalog is empty."}</p>
    <div className="mt-5 flex flex-wrap justify-center gap-3">{filtered && <button type="button" className={buttonClass} onClick={onClear}>Clear filters</button>}{source === "live" && !filtered && <button type="button" className={buttonClass} onClick={onDemo}>Open the demo shop</button>}</div></div>;
}

function RecentOrders() {
  const { orders, ready } = useDemoOrders();
  if (!ready) return null;
  return <section aria-labelledby="recent-orders" className="mt-10"><div className="flex items-center justify-between gap-3"><h2 id="recent-orders" className="flex items-center gap-2 text-heading-lg text-ink"><ReceiptText className="size-5" aria-hidden />Recent demo purchases</h2>{orders.length > 0 && <Link href="/my-orders" className="text-body-sm font-semibold underline">View all</Link>}</div>
    {!orders.length ? <p className="mt-3 rounded-md border border-dashed border-hairline bg-canvas p-5 text-body-sm text-mute">No demo purchases yet. Add something from the demo shop to your cart and try the simulated checkout.</p>
      : <ul className="mt-3 grid gap-3 md:grid-cols-3">{orders.slice(0, 3).map(order => <li key={order.ref}><Link href={`/my-orders/${order.ref}`} className="block rounded-md bg-canvas p-4 hover:bg-secondary-bg"><span className="text-body-sm font-semibold text-ink">{order.ref}</span><span className="mt-1 block text-caption text-mute">{new Date(order.createdAt).toLocaleString()} · {itemCount(order)} · {paymentLabel(order.method)}</span><span className="mt-2 block text-body-md font-semibold text-ink">{formatInr(order.total)}</span></Link></li>)}</ul>}</section>;
}
