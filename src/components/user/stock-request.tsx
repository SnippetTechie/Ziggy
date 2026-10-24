"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { CheckCircle2, ClipboardList, Clock, PackageCheck, Trash2, XCircle } from "lucide-react";
import { api, buttonClass, inputClass, secondaryClass } from "@/components/inventory/ui";
import type { CatalogItem } from "@/modules/demo-store/catalog";
import type { OrderStatus } from "@/modules/orders/tables";
import type { OrderView } from "@/modules/orders/service";
import { QuantityStepper } from "./parts";

export type RequestLine = { item: CatalogItem; quantity: number };
/** Whole units the store can hand out (requests are in whole units). */
export const requestable = (item: CatalogItem) => Math.max(0, Math.floor(Number(item.quantity)));

const statusStyle: Record<OrderStatus, { label: string; className: string; Icon: typeof Clock }> = {
  PLACED: { label: "Placed", className: "bg-warning-pale text-warning-deep", Icon: Clock },
  CONFIRMED: { label: "Confirmed", className: "bg-secondary-bg text-ink", Icon: PackageCheck },
  FULFILLED: { label: "Fulfilled", className: "bg-success-pale text-success-deep", Icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", className: "bg-error-pale text-error", Icon: XCircle },
};
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, className, Icon } = statusStyle[status];
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-semibold ${className}`}><Icon className="size-3.5" aria-hidden />{label}</span>;
}

/** Stock-request tray for the In-store stock tab: real products, whole-unit quantities, no prices, no payment. */
export function RequestTray({ lines, onQuantity, onRemove, onPlaced }: { lines: RequestLine[]; onQuantity: (id: string, quantity: number) => void; onRemove: (id: string) => void; onPlaced: () => void }) {
  const [note, setNote] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [placed, setPlaced] = useState<OrderView | null>(null);
  const inFlight = useRef(false);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null); // same submission = same key, so a retry can never create a second request

  async function place() {
    if (inFlight.current || !lines.length) return;
    inFlight.current = true; setBusy(true); setError("");
    const body = { items: lines.map(line => ({ productId: line.item.id, quantity: String(line.quantity) })), note: note.trim() };
    const fingerprint = JSON.stringify(body);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    try {
      const order = await api<OrderView>("orders", "POST", body, attempt.current.key);
      attempt.current = null; setPlaced(order); setNote(""); onPlaced();
    } catch (e) { setError((e as Error).message); } finally { inFlight.current = false; setBusy(false); }
  }

  if (placed && !lines.length) return <section aria-labelledby="request-done" className="mt-6 rounded-md bg-success-pale p-5 text-success-deep" role="status">
    <h2 id="request-done" className="flex items-center gap-2 text-heading-md"><CheckCircle2 className="size-5" aria-hidden />Stock request {placed.ref} placed</h2>
    <p className="mt-1 text-body-sm">Status: {statusStyle[placed.status].label}. The store team will confirm and fulfil it. No payment is needed.</p>
    <div className="mt-3 flex flex-wrap gap-3"><Link href="/my-orders" className={buttonClass}>View in My Orders</Link><button type="button" className={secondaryClass} onClick={() => setPlaced(null)}>Dismiss</button></div></section>;
  if (!lines.length) return null;
  return <section aria-labelledby="request-title" className="mt-6 rounded-md border-2 border-ink bg-canvas p-5">
    <h2 id="request-title" className="flex items-center gap-2 text-heading-md text-ink"><ClipboardList className="size-5" aria-hidden />Your stock request</h2>
    <p className="mt-1 text-caption text-mute">Real store stock, quantities only. No payment step; the store team confirms and fulfils the request.</p>
    <ul className="mt-3 divide-y divide-hairline-soft">{lines.map(({ item, quantity }) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0"><p className="text-body-sm font-semibold text-ink">{item.name}</p><p className="text-caption text-mute">{item.sku} · {requestable(item)} {item.unit} in stock</p></div>
      <div className="flex items-center gap-2"><QuantityStepper label={item.name} value={quantity} max={Math.max(1, requestable(item))} onChange={value => onQuantity(item.id, value)} /><button type="button" className={`${secondaryClass} gap-2`} aria-label={`Remove ${item.name} from request`} onClick={() => onRemove(item.id)}><Trash2 className="size-4" aria-hidden />Remove</button></div></li>)}</ul>
    <label className="mt-3 grid gap-1.5 text-body-sm font-semibold text-ink">Note (optional)<input className={inputClass} maxLength={500} value={note} onChange={event => setNote(event.target.value)} placeholder="For example: needed for Friday's lab" /></label>
    {error && <p role="alert" className="mt-3 rounded-md bg-error-pale p-3 text-body-sm text-error">{error}</p>}
    <button type="button" className={`${buttonClass} mt-4`} disabled={busy} aria-busy={busy} onClick={place}>{busy ? "Placing request…" : `Place stock request (${lines.reduce((n, l) => n + l.quantity, 0)} units)`}</button>
  </section>;
}
