"use client";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, ImageOff, Minus, Plus, XCircle } from "lucide-react";
import type { CatalogItem } from "@/modules/demo-store/catalog";
import { formatInr } from "@/modules/demo-store/money";

export const demoLabel = "Demo checkout — no money will be charged";

/** Product photo with a consistent frame, descriptive alt text and a fallback if the file is missing or fails to load. */
export function ProductImage({ src, alt, name, category, sizes, priority }: { src?: string | null; alt?: string | null; name: string; category?: string | null; sizes: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  const frame = "relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-md bg-surface-card";
  if (!src || failed) return <div className={frame} role="img" aria-label={`No photo available for ${name}`}><div className="flex flex-col items-center gap-2 px-4 text-center text-mute"><ImageOff className="size-8" aria-hidden /><span className="text-caption">{category ?? "Product"} · photo not available</span></div></div>;
  return <div className={frame}><Image src={src} alt={alt || name} fill sizes={sizes} priority={priority} className="object-contain p-3" onError={() => setFailed(true)} /></div>;
}

export function Availability({ status, quantity, unit }: { status: string; quantity?: string; unit?: string }) {
  const out = status === "Out of stock", low = status === "Low stock";
  const Icon = out ? XCircle : low ? AlertTriangle : CheckCircle2;
  const style = out ? "bg-error-pale text-error" : low ? "bg-warning-pale text-warning-deep" : "bg-success-pale text-success-deep";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-semibold ${style}`}><Icon className="size-3.5" aria-hidden />{status}{!out && quantity !== undefined && <span className="font-normal"> · {Number(quantity)} {unit}</span>}</span>;
}

export function Price({ item, large }: { item: Pick<CatalogItem, "price">; large?: boolean }) {
  if (!item.price) return <span className="text-body-sm text-mute">Price not set</span>;
  return <span className="inline-flex items-baseline gap-2"><span className={`${large ? "text-heading-lg" : "text-heading-md"} text-ink`}>{formatInr(item.price.amount)}</span><span className="text-caption text-mute">{item.price.label}</span></span>;
}

export function DemoBadge({ children = "Demo" }: { children?: ReactNode }) {
  return <span className="inline-block rounded-full bg-accent-purple px-2.5 py-0.5 text-caption font-bold text-on-primary">{children}</span>;
}

export function DemoBanner({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-hairline bg-canvas p-4 text-body-sm text-body"><DemoBadge /> <span className="ml-1">{children}</span></p>;
}

export function QuantityStepper({ value, max, onChange, label }: { value: number; max: number; onChange: (value: number) => void; label: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = (next: number) => onChange(Math.max(1, Math.min(max, Number.isFinite(next) ? Math.floor(next) : 1)));
  const button = "grid size-11 place-items-center rounded-md bg-surface-card text-ink hover:bg-secondary-bg disabled:opacity-40";
  return <div role="group" aria-label={label} className="inline-flex items-center gap-1">
    <button type="button" className={button} aria-label={`Decrease quantity of ${label}`} disabled={value <= 1} onClick={() => commit(value - 1)}><Minus className="size-4" aria-hidden /></button>
    <input aria-label={`Quantity of ${label}`} className="min-h-11 w-14 rounded-md border border-hairline bg-canvas px-2 text-center text-body-sm text-ink" inputMode="numeric" value={draft ?? String(value)} onChange={event => setDraft(event.target.value.replace(/\D/g, "").slice(0, 2))} onBlur={() => { if (draft !== null) { commit(Number(draft)); setDraft(null); } }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); commit(Number(draft ?? value)); setDraft(null); } }} />
    <button type="button" className={button} aria-label={`Increase quantity of ${label}`} disabled={value >= max} onClick={() => commit(value + 1)}><Plus className="size-4" aria-hidden /></button>
  </div>;
}

export function CardSkeleton({ count = 8 }: { count?: number }) {
  return <div role="status" aria-label="Loading products" className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{Array.from({ length: count }, (_, i) => <div key={i} className="animate-pulse rounded-md bg-canvas p-3"><div className="aspect-[4/3] rounded-md bg-surface-card" /><div className="mt-3 h-4 w-3/4 rounded bg-surface-card" /><div className="mt-2 h-4 w-1/3 rounded bg-surface-card" /></div>)}</div>;
}

export function ErrorPanel({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div role="alert" className="mt-6 rounded-md bg-error-pale p-5 text-body-sm text-error"><p className="font-semibold">Something went wrong</p><p className="mt-1">{message}</p>{onRetry && <button type="button" onClick={onRetry} className="mt-3 inline-flex min-h-11 items-center rounded-md bg-canvas px-4 font-semibold text-ink hover:bg-secondary-bg">Try again</button>}</div>;
}
