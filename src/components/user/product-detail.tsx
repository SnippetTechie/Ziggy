"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { useRemote, buttonClass, secondaryClass } from "@/components/inventory/ui";
import type { CatalogItem } from "@/modules/demo-store/catalog";
import { useCart } from "./store";
import { Availability, DemoBanner, ErrorPanel, Price, ProductImage, QuantityStepper } from "./parts";

export function ShopProductDetail({ productId }: { productId: string }) {
  const resource = useRemote<CatalogItem>(`catalog/${productId}`);
  const cart = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState("");
  const item = resource.data;
  const back = <Link href="/inventory" className="inline-flex min-h-11 items-center gap-2 text-body-sm font-semibold underline"><ArrowLeft className="size-4" aria-hidden />Back to inventory</Link>;

  if (resource.loading) return <>{back}<div role="status" aria-label="Loading product" className="mt-4 grid animate-pulse gap-8 md:grid-cols-2"><div className="aspect-[4/3] rounded-md bg-surface-card" /><div className="space-y-3"><div className="h-8 w-2/3 rounded bg-surface-card" /><div className="h-5 w-1/3 rounded bg-surface-card" /><div className="h-24 rounded bg-surface-card" /></div></div></>;
  if (resource.error || !item) return <>{back}<ErrorPanel message={resource.error || "Product not found."} onRetry={resource.refresh} /></>;

  const inCart = cart.lines.find(line => line.productId === item.id)?.quantity ?? 0;
  const room = item.maxQuantity - inCart;
  const credit = item.image?.credit;
  return <>
    {back}
    <div className="mt-4 grid gap-8 md:grid-cols-2">
      <div><ProductImage src={item.image?.src} alt={item.image?.alt} name={item.name} category={item.category} sizes="(min-width:768px) 45vw, 100vw" priority />
        {credit && <p className="mt-2 text-caption text-mute">Photo: {credit.author}, <a className="underline" href={credit.licenseUrl} target="_blank" rel="noreferrer">{credit.license}</a> via <a className="underline" href={credit.sourceUrl} target="_blank" rel="noreferrer">Wikimedia Commons</a></p>}</div>
      <div className="flex flex-col gap-4">
        <div><p className="text-body-sm text-mute">{item.category ?? "Uncategorized"} · SKU {item.sku}</p><h1 className="mt-1 text-heading-xl text-ink">{item.name}</h1></div>
        <Price item={item} large />
        <div><Availability status={item.stockStatus} quantity={item.quantity} unit={item.unit} /></div>
        {item.description && <p className="text-body-md text-body">{item.description}</p>}
        {item.source === "demo" ? <>
          <DemoBanner>Demo product. Price and stock are sample data; checkout is simulated.</DemoBanner>
          {!item.purchasable ? <p role="status" className="rounded-md bg-error-pale p-4 text-body-sm text-error">This product is out of stock and cannot be added to your cart.</p> : <div className="flex flex-wrap items-end gap-4">
            <div><span className="mb-1.5 block text-body-sm font-semibold text-ink">Quantity</span><QuantityStepper label={item.name} value={Math.min(quantity, Math.max(room, 1))} max={Math.max(room, 1)} onChange={setQuantity} /></div>
            <button type="button" className={buttonClass} disabled={!cart.ready || room <= 0} onClick={() => { const amount = Math.min(quantity, room); cart.add({ productId: item.id, quantity: amount, unitPrice: item.price!.amount }, item.maxQuantity); setAdded(`Added ${amount} × ${item.name} to your cart.`); setQuantity(1); }}>{room <= 0 ? "Maximum already in cart" : "Add to cart"}</button>
          </div>}
          {inCart > 0 && <p className="text-body-sm text-mute">{inCart} in your cart.</p>}
          <p role="status" className="text-body-sm text-success-deep">{added}</p>
          {inCart > 0 && <Link href="/cart" className={`${secondaryClass} gap-2 self-start`}><ShoppingCart className="size-4" aria-hidden />Go to cart</Link>}
        </> : <p className="rounded-md border border-hairline bg-canvas p-4 text-body-sm text-body">Live inventory item. Selling prices are not recorded in the inventory system, so it cannot be added to the demo cart.</p>}
      </div>
    </div>
  </>;
}
