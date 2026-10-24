"use client";
import { useRef, useState } from "react";
import { api, useRemote, Field, Notice, inputClass, buttonClass, secondaryClass } from "@/components/inventory/ui";
import type { OrderView, OrderAction } from "@/modules/orders/service";
import { ErrorPanel } from "./parts";
import { OrderStatusBadge } from "./stock-request";

/** Admin screen for real, server-backed customer stock requests (never shows browser-only demo purchases). */
export function AdminOrdersScreen() {
  const [status, setStatus] = useState("");
  const orders = useRemote<OrderView[]>(`orders?scope=all${status ? `&status=${status}` : ""}`);
  const [busy, setBusy] = useState<string | null>(null), [error, setError] = useState(""), [success, setSuccess] = useState("");
  const inFlight = useRef(false);

  async function act(order: OrderView, action: OrderAction) {
    if (inFlight.current) return; // a double click can never send two transitions
    inFlight.current = true; setBusy(order.id); setError(""); setSuccess("");
    try {
      const updated = await api<OrderView>(`orders/${order.id}/${action}`, "POST", {});
      setSuccess(`${order.ref} is now ${updated.status.toLowerCase()}${action === "fulfil" ? ". Stock was reduced by the requested quantities." : "."}`);
    } catch (e) { setError((e as Error).message); }
    finally { inFlight.current = false; setBusy(null); orders.refresh(); }
  }

  return <>
    <h1 className="text-heading-xl text-ink">Customer orders</h1>
    <p className="mt-2 max-w-2xl text-body-sm text-mute">Stock requests placed by customers (quantities only, no payment). Fulfilling an order reduces stock once, atomically, and appears in movement history.</p>
    <div className="mt-5 max-w-xs"><Field label="Status"><select className={inputClass} value={status} onChange={event => setStatus(event.target.value)}><option value="">All orders</option><option value="PLACED">Placed</option><option value="CONFIRMED">Confirmed</option><option value="FULFILLED">Fulfilled</option><option value="CANCELLED">Cancelled</option></select></Field></div>
    <Notice error={error} success={success} />
    {orders.loading ? <p role="status" className="py-8 text-mute">Loading orders…</p> : orders.error ? <ErrorPanel message={orders.error} onRetry={orders.refresh} />
      : !orders.data?.length ? <p className="mt-6 rounded-md border border-dashed border-hairline bg-canvas px-6 py-12 text-center text-body-sm text-mute">No customer orders {status ? "with this status" : "yet"}.</p>
      : <ul className="mt-4 space-y-3">{orders.data.map(order => <li key={order.id} className="rounded-md bg-canvas p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-body-md font-semibold text-ink">{order.ref}</p><p className="text-body-sm text-body">Customer: <strong>{order.customer || "Unknown"}</strong></p><p className="text-caption text-mute">{new Date(order.createdAt).toLocaleString()}{order.note ? ` · ${order.note}` : ""}{order.processedBy ? ` · handled by ${order.processedBy}` : ""}</p></div>
          <OrderStatusBadge status={order.status} />
        </div>
        <ul className="mt-3 divide-y divide-hairline-soft text-body-sm">{order.items.map(item => <li key={item.productId} className="flex justify-between gap-3 py-1.5"><span>{item.productName} <span className="text-caption text-mute">{item.sku}</span></span><span className="font-semibold text-ink">{Number(item.quantity)} {item.unitLabel}</span></li>)}</ul>
        <div className="mt-3 flex flex-wrap gap-2">
          {order.status === "PLACED" && <button type="button" className={buttonClass} disabled={busy !== null} onClick={() => act(order, "confirm")}>Confirm</button>}
          {order.status === "CONFIRMED" && <button type="button" className={buttonClass} disabled={busy !== null} onClick={() => act(order, "fulfil")}>{busy === order.id ? "Working…" : "Fulfil (reduce stock)"}</button>}
          {(order.status === "PLACED" || order.status === "CONFIRMED") && <button type="button" className={secondaryClass} disabled={busy !== null} onClick={() => act(order, "cancel")}>Cancel order</button>}
        </div>
      </li>)}</ul>}
  </>;
}
