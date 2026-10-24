"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";
export const inputClass = "min-h-11 w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-body-sm text-ink";
export const buttonClass = "inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2 text-body-sm font-bold text-on-primary hover:bg-primary-pressed disabled:cursor-wait disabled:opacity-50";
export const secondaryClass = "inline-flex min-h-11 items-center justify-center rounded-md bg-surface-card px-4 py-2 text-body-sm font-semibold text-ink hover:bg-secondary-bg disabled:opacity-50";
export async function api<T>(path: string, method = "GET", body?: unknown, key?: string): Promise<T> {
  const response = await fetch(`/api/v1/${path}`, { method, cache: "no-store", headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(key ? { "Idempotency-Key": key } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.details?.map((d: { field: string; message: string }) => `${d.field}: ${d.message}`).join("; ") || result.error?.message || "The request failed. Try again.");
  return result.data;
}
export function useRemote<T>(path: string) {
  const [state, setState] = useState<{ data: T | null; error: string; loading: boolean }>({ data: null, error: "", loading: true });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let active = true;
    api<T>(path).then(data => { if (active) setState({ data, error: "", loading: false }); }).catch(error => { if (active) setState({ data: null, error: error.message, loading: false }); });
    return () => { active = false; };
  }, [path, revision]);
  return { ...state, refresh };
}
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="grid gap-1.5 text-body-sm font-semibold text-ink">{label}{children}{hint && <span className="text-caption font-normal text-mute">{hint}</span>}</label>;
}
export function Notice({ error, success }: { error?: string; success?: string }) {
  if (error) return <p role="alert" className="my-4 rounded-md bg-error-pale p-4 text-body-sm text-error">{error}</p>;
  if (success) return <p role="status" className="my-4 rounded-md bg-success-pale p-4 text-body-sm text-success-deep">{success}</p>;
  return null;
}
export function Status({ value }: { value: string }) {
  const style = value === "Out of stock" ? "bg-error-pale text-error" : value === "Low stock" ? "bg-warning-pale text-warning-deep" : "bg-success-pale text-success-deep";
  return <span className={`inline-block rounded-full px-3 py-1 text-caption font-semibold ${style}`}>{value}</span>;
}
export function Table({ headings, children, empty }: { headings: string[]; children: ReactNode; empty?: boolean }) {
  return <div className="mt-5 overflow-x-auto rounded-md border border-hairline bg-canvas"><table className="w-full text-left text-body-sm"><thead className="bg-surface-card text-mute"><tr>{headings.map(h => <th key={h} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y divide-hairline-soft">{empty ? <tr><td colSpan={headings.length} className="px-4 py-12 text-center text-mute">No records yet. Add your first record to get started.</td></tr> : children}</tbody></table></div>;
}
export function Cell({ children }: { children: ReactNode }) { return <td className="px-4 py-3 align-top">{children}</td>; }
export function Loading() { return <p role="status" className="py-8 text-mute">Loading your data…</p>; }
export type Category = { id: string; name: string };
export type Supplier = { id: string; name: string; email: string | null; phone: string | null; address: string | null; isActive: boolean };
export type Product = { id: string; name: string; sku: string; description: string | null; categoryId: string | null; category: string | null; unitLabel: string; lowStockThreshold: string | null; quantity: string; stockStatus: string; isActive: boolean };
export type PageData<T> = { items: T[]; nextCursor: string | null };
