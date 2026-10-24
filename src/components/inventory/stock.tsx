"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { api, useRemote, Field, Notice, Table, Cell, Loading, inputClass, buttonClass, secondaryClass, type Product, type Supplier, type PageData } from "./ui";
import { inReasons, outReasons } from "@/server/validation";
export function StockScreen({ direction }: { direction: "in" | "out" }) {
  const [search, setSearch] = useState("");
  const products = useRemote<PageData<Product>>(`products?limit=200&search=${encodeURIComponent(search)}`);
  const suppliers = useRemote<Supplier[]>("suppliers");
  const [error, setError] = useState(""), [success, setSuccess] = useState(""), [busy, setBusy] = useState(false);
  const retry = useRef<{ fingerprint: string; key: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const formElement = event.currentTarget, form = new FormData(formElement);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    const body = { productId: value("productId"), quantity: value("quantity"), reasonCode: value("reasonCode"), supplierId: direction === "in" ? value("supplierId") || null : null, unitCost: direction === "in" ? value("unitCost") || null : null, reference: value("reference"), note: value("note") };
    const fingerprint = JSON.stringify({ direction, ...body });
    if (retry.current?.fingerprint !== fingerprint) retry.current = { fingerprint, key: crypto.randomUUID() };
    setBusy(true); setError(""); setSuccess("");
    try {
      const result = await api<{ balanceAfter: string }>(`stock-${direction}`, "POST", body, retry.current!.key);
      retry.current = null; formElement.reset(); products.refresh();
      setSuccess(`Stock ${direction} recorded. New quantity: ${result.balanceAfter}.`);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <><h1 className="text-heading-xl text-ink">Stock {direction}</h1><p className="mt-2 text-body-sm text-mute">{direction === "in" ? "Record a purchase, return, or opening stock." : "Record stock issued, used, damaged, or lost."} Saving updates stock immediately and records immutable history.</p><Notice error={error || products.error || suppliers.error} success={success} />
    <form className="mt-6 max-w-3xl rounded-md border border-hairline bg-canvas p-5" onSubmit={submit}><div className="grid gap-4 sm:grid-cols-2"><Field label="Find a product"><input className={inputClass} type="search" placeholder="Type a product name or SKU" value={search} onChange={e => setSearch(e.target.value)} /></Field><Field label="Product" hint="Search above to narrow the product list."><select className={inputClass} name="productId" required defaultValue=""><option value="">Select a product</option>{products.data?.items.map(p => <option value={p.id} key={p.id}>{p.name} · {p.sku} · {p.quantity} {p.unitLabel}</option>)}</select></Field><Field label="Quantity"><input className={inputClass} name="quantity" type="number" required min="0.000001" step="0.000001" /></Field><Field label="Reason"><select className={inputClass} name="reasonCode">{(direction === "in" ? inReasons : outReasons).map(r => <option key={r} value={r}>{r.replaceAll("_", " ")}</option>)}</select></Field>{direction === "in" && <><Field label="Supplier (optional)"><select className={inputClass} name="supplierId"><option value="">No supplier</option>{suppliers.data?.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field><Field label="Unit cost (optional, INR)"><input className={inputClass} name="unitCost" type="number" min="0" step="0.000001" /></Field></>}<Field label="Reference (optional)"><input className={inputClass} name="reference" maxLength={120} placeholder="Invoice or issue-slip number" /></Field><Field label="Note (optional)"><textarea className={inputClass} name="note" maxLength={1000} /></Field></div><button className={`${buttonClass} mt-5`} disabled={busy || products.loading || !products.data?.items.length}>{busy ? "Saving…" : `Record stock ${direction}`}</button>{!products.loading && !products.data?.items.length && <p className="mt-4 text-body-sm text-mute">No matching active products. Ask an Admin to add products first.</p>}</form></>;
}
export type Movement = { id: string; productName: string; sku: string; createdAt: string; movementType: string; quantity: string; balanceAfter: string; reasonCode: string; actor: string; reference: string };
export function MovementTable({ rows }: { rows: Movement[] }) {
  return <Table headings={["Date", "Product", "Type / reason", "Quantity", "Balance after", "Recorded by", "Reference"]} empty={!rows.length}>{rows.map(row => <tr key={row.id}><Cell>{new Date(row.createdAt).toLocaleString()}</Cell><Cell>{row.productName}<span className="block text-caption text-mute">{row.sku}</span></Cell><Cell>{row.movementType.replaceAll("_", " ")}<span className="block text-caption text-mute">{row.reasonCode.replaceAll("_", " ")}</span></Cell><Cell>{row.quantity}</Cell><Cell>{row.balanceAfter}</Cell><Cell>{row.actor}</Cell><Cell>{row.reference || "—"}</Cell></tr>)}</Table>;
}
export function MovementsScreen({ productId }: { productId?: string }) {
  const [type, setType] = useState(""), [from, setFrom] = useState(""), [to, setTo] = useState(""), [cursor, setCursor] = useState("");
  const query = new URLSearchParams({ ...(productId ? { productId } : {}), ...(type ? { type } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}), ...(cursor ? { cursor } : {}) });
  const resource = useRemote<PageData<Movement>>(`stock-movements?${query}`);
  return <><h1 className="text-heading-xl text-ink">Movement history</h1><p className="mt-2 text-body-sm text-mute">Every posted stock transaction, with its actor and resulting balance.</p><Notice error={resource.error} /><div className="mt-6 grid gap-4 sm:grid-cols-3"><Field label="Type"><select className={inputClass} value={type} onChange={e => { setType(e.target.value); setCursor(""); }}><option value="">All movements</option><option value="STOCK_IN">Stock in</option><option value="STOCK_OUT">Stock out</option></select></Field><Field label="From date"><input className={inputClass} type="date" value={from} onChange={e => { setFrom(e.target.value); setCursor(""); }} /></Field><Field label="To date"><input className={inputClass} type="date" value={to} onChange={e => { setTo(e.target.value); setCursor(""); }} /></Field></div>{resource.loading ? <Loading /> : <MovementTable rows={resource.data?.items ?? []} />}<div className="mt-4 flex gap-3">{cursor && <button className={secondaryClass} onClick={() => setCursor("")}>First page</button>}{resource.data?.nextCursor && <button className={secondaryClass} onClick={() => setCursor(resource.data!.nextCursor!)}>Next page</button>}</div></>;
}
export function ProductDetail({ productId, canViewHistory }: { productId: string; canViewHistory: boolean }) {
  const resource = useRemote<Product>(`products/${productId}`);
  return <><Link href="/inventory" className="text-body-sm underline">Back to inventory</Link><Notice error={resource.error} />{resource.loading ? <Loading /> : resource.data && <section className="my-6 rounded-md border border-hairline bg-canvas p-6"><h1 className="text-heading-xl text-ink">{resource.data.name}</h1><p className="mt-2 text-mute">SKU: {resource.data.sku}</p><p className="my-4 text-heading-lg">{resource.data.quantity} {resource.data.unitLabel} available</p><p>{resource.data.description}</p><p className="mt-3 text-body-sm text-mute">Low-stock threshold: {resource.data.lowStockThreshold ?? "Workspace default"}</p></section>}{canViewHistory && <MovementsScreen productId={productId} />}</>;
}
