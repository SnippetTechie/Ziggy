"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, ClipboardList, ReceiptText } from "lucide-react";
import { buttonClass, secondaryClass, useRemote } from "@/components/inventory/ui";
import type { OrderView } from "@/modules/orders/service";
import { formatInr } from "@/modules/demo-store/money";
import { paymentLabel, type DemoOrder } from "@/modules/demo-store/orders";
import { useDemoOrders } from "./store";
import { DemoBadge, ErrorPanel, ProductImage } from "./parts";
import { OrderStatusBadge } from "./stock-request";

export const itemCount = (order: DemoOrder) => { const n = order.items.reduce((sum, i) => sum + i.quantity, 0); return `${n} ${n === 1 ? "item" : "items"}`; };
const persistenceNote = "Demo orders are saved only in this browser for your account. Clearing site data or using another device will not show them. They are not operational records and never change real stock.";

export function OrdersScreen() {
  const { orders, ready, failed } = useDemoOrders();
  const requests = useRemote<OrderView[]>("orders?scope=mine");
  return <>
    <h1 className="text-heading-xl text-ink">My Orders</h1>

    <section aria-labelledby="stock-requests" className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="stock-requests" className="text-heading-lg text-ink">Stock requests</h2><button type="button" className={secondaryClass} onClick={requests.refresh}>Refresh status</button></div>
      <p className="mt-1 max-w-2xl text-body-sm text-mute">Real requests to the store, saved on the server. Quantities only: no prices and no payment. The store team confirms and fulfils them.</p>
      {requests.loading ? <p role="status" className="py-6 text-mute">Loading your stock requests…</p>
        : requests.error ? <ErrorPanel message={requests.error} onRetry={requests.refresh} />
        : !requests.data?.length ? <div className="mt-4 rounded-md border border-dashed border-hairline bg-canvas px-6 py-10 text-center"><ClipboardList className="mx-auto size-8 text-mute" aria-hidden /><h3 className="mt-2 text-heading-md text-ink">No stock requests yet</h3><p className="mt-1 text-body-sm text-mute">Open <strong>In-store stock</strong> in the shop, add items and place a stock request.</p><Link href="/inventory" className={`${buttonClass} mt-4`}>Go to the shop</Link></div>
        : <ul className="mt-4 space-y-3">{requests.data.map(order => <li key={order.id} className="rounded-md bg-canvas p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-body-md font-semibold text-ink">{order.ref}</p><p className="text-caption text-mute">{new Date(order.createdAt).toLocaleString()}{order.note ? ` · ${order.note}` : ""}</p></div><OrderStatusBadge status={order.status} /></div>
          <ul className="mt-3 divide-y divide-hairline-soft text-body-sm">{order.items.map(item => <li key={item.productId} className="flex justify-between gap-3 py-1.5"><span>{item.productName} <span className="text-caption text-mute">{item.sku}</span></span><span className="font-semibold text-ink">{Number(item.quantity)} {item.unitLabel}</span></li>)}</ul>
          {order.status === "FULFILLED" && <p className="mt-2 text-caption text-success-deep">Fulfilled: the stock has been handed out.</p>}
          {order.status === "CANCELLED" && <p className="mt-2 text-caption text-error">Cancelled. No stock was handed out.</p>}
        </li>)}</ul>}
    </section>

    <section aria-labelledby="demo-purchases" className="mt-10">
      <h2 id="demo-purchases" className="text-heading-lg text-ink">Demo purchases</h2>
      <p className="mt-1 max-w-2xl text-body-sm text-mute"><DemoBadge /> {persistenceNote} They are separate from stock requests and are never shown to the store team.</p>
      {failed ? <ErrorPanel message="We could not confirm your account, so your demo purchases cannot be shown. Refresh the page or sign in again." />
        : !ready ? <p role="status" className="py-6 text-mute">Loading your demo purchases…</p>
        : !orders.length ? <div className="mt-4 rounded-md border border-dashed border-hairline bg-canvas px-6 py-10 text-center"><ReceiptText className="mx-auto size-8 text-mute" aria-hidden /><h3 className="mt-2 text-heading-md text-ink">No demo purchases yet</h3><p className="mt-1 text-body-sm text-mute">Buy something in the <strong>Demo shop</strong> to see it here.</p></div>
        : <ul className="mt-4 space-y-3">{orders.map(order => <li key={order.ref}><Link href={`/my-orders/${order.ref}`} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-canvas p-4 hover:bg-secondary-bg"><span><span className="block text-body-md font-semibold text-ink">{order.ref}</span><span className="block text-caption text-mute">{new Date(order.createdAt).toLocaleString()} · {itemCount(order)} · {paymentLabel(order.method)}</span></span><span className="text-right"><span className="block text-body-md font-semibold text-ink">{formatInr(order.total)}</span><span className="block text-caption text-success-deep">Payment simulated</span></span></Link></li>)}</ul>}
    </section>
  </>;
}

export function OrderDetail({ orderRef }: { orderRef: string }) {
  const { orders, ready, failed } = useDemoOrders();
  const placed = useSearchParams().get("placed") === "1";
  const back = <Link href="/my-orders" className="inline-flex min-h-11 items-center gap-2 text-body-sm font-semibold underline"><ArrowLeft className="size-4" aria-hidden />My Orders</Link>;
  if (failed) return <>{back}<ErrorPanel message="We could not confirm your account, so this order cannot be shown." /></>;
  if (!ready) return <>{back}<p role="status" className="py-8 text-mute">Loading order…</p></>;
  const order = orders.find(o => o.ref === orderRef);
  if (!order) return <>{back}<div className="mt-6 rounded-md border border-dashed border-hairline bg-canvas px-6 py-14 text-center"><h1 className="text-heading-md text-ink">Order not found</h1><p className="mt-2 text-body-sm text-mute">This demo order is not stored in this browser. {persistenceNote}</p><Link href="/inventory" className={`${secondaryClass} mt-5`}>Back to inventory</Link></div></>;
  return <OrderView order={order} placed={placed} back={back} />;
}

function OrderView({ order, placed, back }: { order: DemoOrder; placed: boolean; back: React.ReactNode }) {
  return <>
    {back}
    {placed && <div role="status" className="mt-4 flex items-start gap-3 rounded-md bg-success-pale p-4 text-success-deep"><CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden /><div><p className="text-body-md font-bold">Demo order placed</p><p className="text-body-sm">Simulated payment succeeded. No money was charged and no real stock was changed.</p></div></div>}
    <div className="mt-4 flex flex-wrap items-center gap-3"><h1 className="text-heading-xl text-ink">{order.ref}</h1><DemoBadge>Demo order</DemoBadge></div>
    <dl className="mt-4 grid gap-4 rounded-md bg-canvas p-5 text-body-sm sm:grid-cols-3"><div><dt className="text-mute">Placed</dt><dd className="font-semibold text-ink">{new Date(order.createdAt).toLocaleString()}</dd></div><div><dt className="text-mute">Payment</dt><dd className="font-semibold text-ink">{paymentLabel(order.method)}</dd></div><div><dt className="text-mute">Payment status</dt><dd className="font-semibold text-success-deep">Paid — simulated (demo)</dd></div></dl>
    <ul className="mt-4 space-y-3" aria-label="Items in this order">{order.items.map(item => <li key={item.productId} className="flex items-center gap-4 rounded-md bg-canvas p-3"><div className="w-20 shrink-0"><ProductImage src={item.imageSrc} alt={item.imageAlt} name={item.name} sizes="80px" /></div><div className="min-w-0 flex-1"><p className="text-body-sm font-semibold text-ink">{item.name}</p><p className="text-caption text-mute">SKU {item.sku} · {item.quantity} × {formatInr(item.unitPrice)}</p></div><p className="text-body-sm font-semibold text-ink">{formatInr(item.lineTotal)}</p></li>)}</ul>
    <p className="mt-4 flex justify-between rounded-md bg-canvas p-5 text-body-md font-semibold text-ink"><span>Total (demo)</span><span>{formatInr(order.total)}</span></p>
    <p className="mt-4 text-caption text-mute">{persistenceNote}</p>
    <div className="mt-5 flex flex-wrap gap-3"><Link href="/inventory" className={buttonClass}>Continue browsing</Link><Link href="/my-orders" className={secondaryClass}>All orders</Link></div>
  </>;
}
