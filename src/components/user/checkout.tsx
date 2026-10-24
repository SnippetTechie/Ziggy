"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FlaskConical, ShieldCheck } from "lucide-react";
import { api, buttonClass, secondaryClass } from "@/components/inventory/ui";
import type { CheckoutResult } from "@/modules/demo-store/checkout";
import { formatInr } from "@/modules/demo-store/money";
import { useCart, useDemoOrders } from "./store";
import { useValidatedCart } from "./use-validated-cart";
import { CartRow } from "./cart";
import { demoLabel, DemoBadge, ErrorPanel, ProductImage } from "./parts";

const methods = [["DEMO_UPI", "Demo UPI", "Simulated UPI approval. No UPI ID or PIN is asked for."], ["DEMO_CARD", "Demo Card", "Simulated card payment. No card number, expiry or CVV is asked for."]] as const;
const scenarios = [["approve", "Approve payment", "Payment succeeds."], ["decline", "Decline payment", "Payment always fails, so you can see the failure state."], ["fail-once", "Fail first try, then succeed", "The first attempt times out; pressing Retry succeeds."]] as const;

export function CheckoutScreen() {
  const router = useRouter();
  const cart = useCart();
  const orders = useDemoOrders();
  const check = useValidatedCart(cart.lines, cart.ready);
  const [method, setMethod] = useState<(typeof methods)[number][0]>("DEMO_UPI");
  const [scenario, setScenario] = useState<(typeof scenarios)[number][0]>("approve");
  const [busy, setBusy] = useState(false), [placed, setPlaced] = useState(false);
  const [failure, setFailure] = useState(""), [problem, setProblem] = useState("");
  const inFlight = useRef(false);
  // One Idempotency-Key per (cart contents + method); retries reuse it, a changed cart gets a fresh one.
  const session = useRef<{ fingerprint: string; key: string; attempts: number } | null>(null);

  const title = <h1 className="text-heading-xl text-ink">Checkout</h1>;
  if (cart.failed) return <>{title}<ErrorPanel message="We could not confirm your account, so checkout is unavailable. Refresh the page or sign in again." /></>;
  if (!cart.ready || (check.loading && !placed)) return <>{title}<p role="status" className="py-8 text-mute">Preparing checkout…</p></>;
  if (placed) return <>{title}<p role="status" className="py-8 text-mute">Demo order placed. Opening your confirmation…</p></>;
  if (!cart.lines.length) return <>{title}<div className="mt-6 rounded-md border border-dashed border-hairline bg-canvas px-6 py-14 text-center"><h2 className="text-heading-md text-ink">Your cart is empty</h2><p className="mt-2 text-body-sm text-mute">Add products before checking out.</p><Link href="/inventory" className={`${buttonClass} mt-5`}>Continue shopping</Link></div></>;
  const result = check.result;
  if (!result) return <>{title}<ErrorPanel message={check.error || "Could not verify your cart."} onRetry={check.refresh} /></>;
  const blocked = result.blocking || result.priceChanged;

  async function place() {
    if (inFlight.current || !result) return; // blocks double clicks and Enter-key repeats before React re-renders
    inFlight.current = true; setBusy(true); setFailure(""); setProblem("");
    const fingerprint = JSON.stringify({ lines: cart.lines, method });
    if (session.current?.fingerprint !== fingerprint) session.current = { fingerprint, key: crypto.randomUUID(), attempts: 0 };
    const current = session.current; current.attempts += 1;
    let success = false;
    try {
      const outcome = await api<CheckoutResult>("catalog/demo-checkout", "POST", { lines: cart.lines, method, scenario, attempt: current.attempts }, current.key);
      if (outcome.outcome === "PAID") { success = true; orders.add(outcome.order); cart.clear(); setPlaced(true); router.push(`/my-orders/${outcome.order.ref}?placed=1`); }
      else setFailure(outcome.message);
    } catch (error) { setProblem((error as Error).message); check.refresh(); }
    finally { if (!success) { inFlight.current = false; setBusy(false); } }
  }

  return <>
    {title}
    <div role="note" className="mt-3 flex items-center gap-3 rounded-md bg-accent-purple p-4 text-body-md font-bold text-on-primary"><FlaskConical className="size-5 shrink-0" aria-hidden />{demoLabel}</div>
    {problem && <p role="alert" className="mt-4 rounded-md bg-error-pale p-4 text-body-sm text-error">{problem}</p>}
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <section aria-labelledby="review-heading"><h2 id="review-heading" className="text-heading-md text-ink">1. Review items</h2>
          {blocked && <p role="alert" className="mt-3 rounded-md bg-warning-pale p-4 text-body-sm text-warning-deep">Your cart changed since you added these items. Resolve the notes below, or <Link href="/cart" className="font-semibold underline">review your cart</Link>.</p>}
          <ul className="mt-3 space-y-3">{blocked ? result.lines.map(line => <CartRow key={line.productId} line={line} cart={cart} />) : result.lines.map(line => <li key={line.productId} className="flex items-center gap-4 rounded-md bg-canvas p-3"><div className="w-16 shrink-0"><ProductImage src={line.imageSrc} alt={line.imageAlt} name={line.name} sizes="64px" /></div><div className="min-w-0 flex-1"><p className="truncate text-body-sm font-semibold text-ink">{line.name}</p><p className="text-caption text-mute">{line.quantity} × {formatInr(line.unitPrice)}</p></div><p className="text-body-sm font-semibold text-ink">{formatInr(line.lineTotal)}</p></li>)}</ul></section>
        <fieldset className="rounded-md bg-canvas p-5"><legend className="px-1 text-heading-md text-ink">2. Demo payment method</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">{methods.map(([value, label, hint]) => <label key={value} className={`flex min-h-11 cursor-pointer gap-3 rounded-md border p-4 ${method === value ? "border-ink bg-surface-card" : "border-hairline"}`}><input type="radio" name="method" className="mt-1" checked={method === value} onChange={() => setMethod(value)} /><span><span className="block text-body-sm font-semibold text-ink">{label}</span><span className="block text-caption text-mute">{hint}</span></span></label>)}</div>
          <p className="mt-3 flex items-start gap-2 text-caption text-mute"><ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />Ziggy never collects card numbers, CVV, bank credentials or UPI PINs, and is not connected to any payment gateway.</p></fieldset>
        <fieldset className="rounded-md border-2 border-dashed border-accent-purple bg-canvas p-5"><legend className="px-1 text-heading-md text-ink"><DemoBadge>Demo controls</DemoBadge> <span className="ml-1">3. Choose the simulated outcome</span></legend>
          <div className="mt-2 grid gap-3">{scenarios.map(([value, label, hint]) => <label key={value} className="flex min-h-11 cursor-pointer gap-3 rounded-md border border-hairline p-3"><input type="radio" name="scenario" className="mt-1" checked={scenario === value} onChange={() => setScenario(value)} /><span><span className="block text-body-sm font-semibold text-ink">{label}</span><span className="block text-caption text-mute">{hint}</span></span></label>)}</div></fieldset>
      </div>
      <aside className="rounded-md bg-canvas p-5 lg:sticky lg:top-24" aria-label="Order summary">
        <h2 className="text-heading-md text-ink">Order summary</h2>
        <dl className="mt-4 space-y-2 text-body-sm"><div className="flex justify-between"><dt>Items</dt><dd>{result.lines.reduce((n, l) => n + l.quantity, 0)}</dd></div><div className="flex justify-between"><dt>Payment</dt><dd>{methods.find(m => m[0] === method)?.[1]}</dd></div><div className="flex justify-between text-body-md font-semibold text-ink"><dt>Total</dt><dd>{formatInr(result.total)}</dd></div></dl>
        {failure && <div role="alert" className="mt-4 rounded-md bg-error-pale p-3 text-body-sm text-error"><p className="font-semibold">Payment not completed</p><p className="mt-1">{failure}</p></div>}
        <button type="button" className={`${buttonClass} mt-4 w-full`} disabled={busy || blocked} aria-busy={busy} onClick={place}>{busy ? "Processing demo payment…" : failure ? "Retry demo payment" : `Place demo order · ${formatInr(result.total)}`}</button>
        <Link href="/cart" className={`${secondaryClass} mt-3 w-full`}>Back to cart</Link>
        <p className="mt-3 text-caption text-mute">A demo order is simulated: it does not charge anything, change the store&rsquo;s real stock or create stock movements.</p>
      </aside>
    </div>
  </>;
}
