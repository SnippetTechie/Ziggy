"use client";
import Link from "next/link";
import { AlertTriangle, ShoppingBag, Trash2 } from "lucide-react";
import { buttonClass, secondaryClass } from "@/components/inventory/ui";
import type { ValidatedLine } from "@/modules/demo-store/checkout";
import { formatInr } from "@/modules/demo-store/money";
import { useCart } from "./store";
import { useValidatedCart } from "./use-validated-cart";
import { demoLabel, DemoBadge, ErrorPanel, ProductImage, QuantityStepper } from "./parts";

type CartApi = ReturnType<typeof useCart>;

export function CartScreen() {
  const cart = useCart();
  const check = useValidatedCart(cart.lines, cart.ready);
  if (cart.failed) return <><h1 className="text-heading-xl text-ink">Your cart</h1><ErrorPanel message="We could not confirm your account, so the cart cannot be loaded. Refresh the page or sign in again." /></>;
  if (!cart.ready) return <><h1 className="text-heading-xl text-ink">Your cart</h1><p role="status" className="py-8 text-mute">Loading your cart…</p></>;
  if (!cart.lines.length) return <><h1 className="text-heading-xl text-ink">Your cart</h1><div className="mt-6 rounded-md border border-dashed border-hairline bg-canvas px-6 py-14 text-center"><ShoppingBag className="mx-auto size-10 text-mute" aria-hidden /><h2 className="mt-3 text-heading-md text-ink">Your cart is empty</h2><p className="mt-2 text-body-sm text-mute">Add products from the demo store to try the checkout.</p><Link href="/inventory" className={`${buttonClass} mt-5`}>Browse products</Link></div></>;
  const result = check.result;
  const blocked = !result || result.blocking || result.priceChanged;
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-heading-xl text-ink">Your cart</h1><button type="button" className={secondaryClass} onClick={() => cart.clear()}>Clear cart</button></div>
    <p className="mt-2 text-body-sm text-mute"><DemoBadge /> Items come from the demo store. Prices and availability are re-checked each time you open the cart and again at checkout.</p>
    {check.error && <ErrorPanel message={check.error} onRetry={check.refresh} />}
    {!result && !check.error && <p role="status" className="py-8 text-mute">Checking prices and availability…</p>}
    {result && <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_340px]">
      <ul className="space-y-3" aria-label="Cart items">{result.lines.map(line => <CartRow key={line.productId} line={line} cart={cart} />)}</ul>
      <aside className="rounded-md bg-canvas p-5 lg:sticky lg:top-24" aria-label="Order summary">
        <h2 className="text-heading-md text-ink">Order summary</h2>
        <dl className="mt-4 space-y-2 text-body-sm"><div className="flex justify-between"><dt>Items</dt><dd>{result.lines.reduce((n, l) => n + l.quantity, 0)}</dd></div><div className="flex justify-between text-body-md font-semibold text-ink"><dt>Total</dt><dd>{formatInr(result.total)}</dd></div></dl>
        <p className="mt-3 rounded-md bg-surface-card p-3 text-caption text-body">{demoLabel}</p>
        {blocked ? <><button type="button" disabled className={`${buttonClass} mt-4 w-full`}>Proceed to checkout</button><p className="mt-2 text-caption text-error">{result.blocking ? "Resolve the items marked above to continue." : "Accept the updated prices above to continue."}</p></>
          : <Link href="/checkout" className={`${buttonClass} mt-4 w-full`}>Proceed to checkout</Link>}
      </aside>
    </div>}
  </>;
}

export function CartRow({ line, cart }: { line: ValidatedLine; cart: CartApi }) {
  const unknown = line.issues.some(i => i.code === "UNKNOWN_PRODUCT");
  return <li className="rounded-md bg-canvas p-4"><div className="flex gap-4">
    <div className="w-24 shrink-0 sm:w-32"><ProductImage src={line.imageSrc} alt={line.imageAlt} name={line.name} sizes="128px" /></div>
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><Link href={unknown ? "/inventory" : `/inventory/${line.productId}`} className="text-body-md font-semibold text-ink hover:underline">{line.name}</Link>{line.sku && <p className="text-caption text-mute">SKU {line.sku}</p>}</div><p className="text-body-md font-semibold text-ink">{formatInr(line.lineTotal)}</p></div>
      {!unknown && <p className="mt-1 text-body-sm text-mute">{formatInr(line.unitPrice)} each · <span className="text-caption">Demo price</span></p>}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {!unknown && line.available > 0 && <QuantityStepper label={line.name} value={line.quantity} max={line.available} onChange={q => cart.setQuantity(line.productId, q, line.available)} />}
        <button type="button" className={`${secondaryClass} gap-2`} aria-label={`Remove ${line.name} from cart`} onClick={() => cart.remove(line.productId)}><Trash2 className="size-4" aria-hidden />Remove</button>
      </div></div></div>
    {line.issues.map(issue => <div key={issue.code} role="alert" className="mt-3 flex flex-wrap items-center gap-3 rounded-md bg-warning-pale p-3 text-body-sm text-warning-deep"><AlertTriangle className="size-4 shrink-0" aria-hidden /><span className="min-w-0 flex-1">{issue.message}</span>
      {issue.code === "INSUFFICIENT_STOCK" && <button type="button" className={secondaryClass} onClick={() => cart.setQuantity(line.productId, issue.suggestedQuantity ?? 1, line.available)}>Reduce to {issue.suggestedQuantity}</button>}
      {issue.code === "PRICE_CHANGED" && <button type="button" className={secondaryClass} onClick={() => cart.acceptPrice(line.productId, line.unitPrice)}>Accept new price</button>}
    </div>)}
  </li>;
}

