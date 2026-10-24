"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { api, useRemote, Field, Notice, Table, Cell, Status, Loading, buttonClass, secondaryClass, inputClass, type Product, type Category, type PageData } from "./ui";
export function ProductsScreen({ manage = false }: { manage?: boolean }) {
  const [search, setSearch] = useState("");
  const [stock, setStock] = useState("all");
  const [category, setCategory] = useState("");
  const [archived, setArchived] = useState(false);
  const [cursor, setCursor] = useState("");
  const query = new URLSearchParams({ search, stock, status: archived ? "archived" : "active", ...(category ? { categoryId: category } : {}), ...(cursor ? { cursor } : {}) });
  const products = useRemote<PageData<Product>>(`products?${query}`);
  const categories = useRemote<Category[]>("categories");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  async function action(product: Product, verb: string) {
    if (verb === "delete" && !window.confirm(`Delete ${product.name}? Products with stock history must be archived instead.`)) return;
    setBusy(true); setError(""); setSuccess("");
    try { await api(`products/${product.id}${verb === "delete" ? "" : "/" + verb}`, verb === "delete" ? "DELETE" : "POST"); products.refresh(); setSuccess("Product updated."); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-heading-xl text-ink">{manage ? "Products" : "Inventory"}</h1><p className="mt-2 text-body-sm text-mute">{manage ? "Manage your real catalogue and opening stock." : "Search products and check current stock availability."}</p></div>{manage && <button className={buttonClass} onClick={() => setEditing("new")}>Add product</button>}</div>
    <Notice error={error || products.error || categories.error} success={success} />
    {editing && <ProductForm key={editing === "new" ? "new" : editing.id} product={editing === "new" ? undefined : editing} categories={categories.data ?? []} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setSuccess("Product saved to your database."); products.refresh(); }} />}
    <div className="mt-6 grid gap-3 sm:grid-cols-3"><Field label="Search"><input className={inputClass} type="search" value={search} placeholder="Product name or SKU" onChange={e => { setSearch(e.target.value); setCursor(""); }} /></Field><Field label="Category"><select className={inputClass} value={category} onChange={e => { setCategory(e.target.value); setCursor(""); }}><option value="">All categories</option>{categories.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Stock status"><select className={inputClass} value={stock} onChange={e => { setStock(e.target.value); setCursor(""); }}><option value="all">All stock</option><option value="in">In stock</option><option value="low">Low stock (including zero)</option><option value="out">Out of stock</option></select></Field></div>
    {manage && <label className="mt-4 flex items-center gap-2 text-body-sm"><input type="checkbox" checked={archived} onChange={e => { setArchived(e.target.checked); setCursor(""); }} />Show archived products</label>}
    {products.loading ? <Loading /> : <Table headings={["Product / SKU", "Category", "On hand", "Status", ...(manage ? ["Actions"] : [])]} empty={!products.data?.items.length}>{products.data?.items.map(product => <tr key={product.id}><Cell><Link href={`/inventory/${product.id}`} className="font-semibold underline">{product.name}</Link><span className="mt-1 block text-caption text-mute">{product.sku}</span></Cell><Cell>{product.category ?? "Uncategorized"}</Cell><Cell>{product.quantity} {product.unitLabel}</Cell><Cell><Status value={product.stockStatus} /></Cell>{manage && <Cell><div className="flex flex-wrap gap-2"><button disabled={busy} className={secondaryClass} onClick={() => setEditing(product)}>Edit</button><button disabled={busy} className={secondaryClass} onClick={() => action(product, product.isActive ? "deactivate" : "reactivate")}>{product.isActive ? "Archive" : "Restore"}</button><button disabled={busy} className={secondaryClass} onClick={() => action(product, "delete")}>Delete</button></div></Cell>}</tr>)}</Table>}
    <div className="mt-4 flex gap-3">{cursor && <button className={secondaryClass} onClick={() => setCursor("")}>First page</button>}{products.data?.nextCursor && <button className={secondaryClass} onClick={() => setCursor(products.data!.nextCursor!)}>Next page</button>}</div>
  </>;
}
function ProductForm({ product, categories, onClose, onSaved }: { product?: Product; categories: Category[]; onClose: () => void; onSaved: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    const body = { name: value("name"), sku: value("sku"), description: value("description"), categoryId: value("categoryId") || null, unitLabel: value("unitLabel"), lowStockThreshold: value("threshold") || null, ...(!product && value("openingQuantity") ? { openingQuantity: value("openingQuantity") } : {}) };
    try { await api(product ? `products/${product.id}` : "products", product ? "PATCH" : "POST", body); onSaved(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <form onSubmit={save} className="mt-6 rounded-md border border-hairline bg-canvas p-5"><h2 className="mb-4 text-heading-md text-ink">{product ? "Edit product" : "Add a product"}</h2><Notice error={error} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Product name"><input className={inputClass} name="name" required maxLength={180} defaultValue={product?.name} /></Field><Field label="SKU"><input className={inputClass} name="sku" required maxLength={64} defaultValue={product?.sku} /></Field><Field label="Category"><select className={inputClass} name="categoryId" defaultValue={product?.categoryId ?? ""}><option value="">Uncategorized</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field><Field label="Unit" hint="For example: pcs, kg, litre, box"><input className={inputClass} name="unitLabel" required maxLength={24} defaultValue={product?.unitLabel ?? "pcs"} /></Field><Field label="Low-stock threshold" hint="Leave blank to use the workspace default."><input className={inputClass} name="threshold" type="number" min="0" step="0.000001" defaultValue={product?.lowStockThreshold ?? ""} /></Field>{!product && <Field label="Current / opening quantity" hint="Creates an opening-stock movement with an audit record."><input className={inputClass} name="openingQuantity" type="number" min="0" step="0.000001" defaultValue="0" /></Field>}<Field label="Description"><textarea className={inputClass} name="description" maxLength={2000} defaultValue={product?.description ?? ""} /></Field></div><div className="mt-5 flex gap-3"><button className={buttonClass} disabled={busy}>{busy ? "Saving…" : "Save product"}</button><button className={secondaryClass} type="button" onClick={onClose} disabled={busy}>Cancel</button></div></form>;
}
