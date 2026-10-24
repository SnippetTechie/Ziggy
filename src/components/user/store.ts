"use client";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { addLine, cartCount, parseCart, removeLine, serializeCart, setLinePrice, setLineQuantity, type CartLine } from "@/modules/demo-store/cart";
import { addOrder, parseOrders, serializeOrders, type DemoOrder } from "@/modules/demo-store/orders";
import { api } from "@/components/inventory/ui";

/* ---- tiny external store over localStorage (falls back to memory when storage is blocked) ---- */
const listeners = new Set<() => void>();
const memory = new Map<string, string>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => { listeners.delete(listener); window.removeEventListener("storage", listener); };
}
function read(key: string) {
  try { return window.localStorage.getItem(key) ?? memory.get(key) ?? ""; } catch { return memory.get(key) ?? ""; }
}
function write(key: string, value: string) {
  memory.set(key, value);
  try { window.localStorage.setItem(key, value); } catch { /* storage blocked: memory copy keeps this tab working */ }
  listeners.forEach(listener => listener());
}
const useRaw = (key: string | null) => useSyncExternalStore(subscribe, () => (key ? read(key) : ""), () => "");

/* ---- identity scope: cart and orders are namespaced per workspace + user ---- */
let scopeRequest: Promise<string> | null = null;
function loadScope() {
  scopeRequest ??= api<{ workspaceId: string; userId: string }>("me").then(me => `${me.workspaceId}:${me.userId}`).catch(error => { scopeRequest = null; throw error; });
  return scopeRequest;
}
/** `scope` is null while loading or if the signed-in identity could not be read (then nothing is persisted). */
export function useDemoScope() {
  const [state, setState] = useState<{ scope: string | null; failed: boolean }>({ scope: null, failed: false });
  useEffect(() => {
    let active = true;
    loadScope().then(scope => { if (active) setState({ scope, failed: false }); }).catch(() => { if (active) setState({ scope: null, failed: true }); });
    return () => { active = false; };
  }, []);
  return state;
}

export function useCart() {
  const { scope, failed } = useDemoScope();
  const key = scope ? `ziggy:demo-cart:v1:${scope}` : null;
  const raw = useRaw(key);
  const lines = useMemo(() => parseCart(raw), [raw]);
  const update = useCallback((change: (lines: CartLine[]) => CartLine[]) => { if (key) write(key, serializeCart(change(parseCart(read(key))))); }, [key]);
  return {
    ready: !!scope, failed, lines, count: cartCount(lines),
    add: (line: CartLine, max: number) => update(current => addLine(current, line, max)),
    setQuantity: (productId: string, quantity: number, max?: number) => update(current => setLineQuantity(current, productId, quantity, max)),
    remove: (productId: string) => update(current => removeLine(current, productId)),
    acceptPrice: (productId: string, price: string) => update(current => setLinePrice(current, productId, price)),
    clear: () => update(() => []),
  };
}

export function useDemoOrders() {
  const { scope, failed } = useDemoScope();
  const key = scope ? `ziggy:demo-orders:v1:${scope}` : null;
  const raw = useRaw(key);
  const orders = useMemo(() => parseOrders(raw), [raw]);
  const add = useCallback((order: DemoOrder) => { if (key) write(key, serializeOrders(addOrder(parseOrders(read(key)), order))); }, [key]);
  return { ready: !!scope, failed, orders, add };
}
