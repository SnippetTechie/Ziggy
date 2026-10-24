"use client";
import { useEffect, useState } from "react";
import { api } from "@/components/inventory/ui";
import type { CartLine } from "@/modules/demo-store/cart";
import type { Validation } from "@/modules/demo-store/checkout";

const EMPTY: Validation = { lines: [], total: "0.00", blocking: false, priceChanged: false };

/** Asks the server to re-price and re-check the browser's cart selections. Never trusts locally stored names or totals. */
export function useValidatedCart(lines: CartLine[], ready: boolean) {
  const [state, setState] = useState<{ result: Validation | null; error: string; signature: string }>({ result: null, error: "", signature: "" });
  const [revision, setRevision] = useState(0);
  const signature = JSON.stringify(lines);
  const empty = lines.length === 0;
  useEffect(() => {
    if (!ready || empty) return;
    let active = true;
    api<Validation>("catalog/validate", "POST", { lines: JSON.parse(signature) })
      .then(result => { if (active) setState({ result, error: "", signature }); })
      .catch(error => { if (active) setState({ result: null, error: (error as Error).message, signature }); });
    return () => { active = false; };
  }, [signature, empty, ready, revision]);
  if (ready && empty) return { result: EMPTY, error: "", loading: false, refresh: () => setRevision(value => value + 1) };
  const current = state.signature === signature;
  return { result: current ? state.result : null, error: current ? state.error : "", loading: !ready || !current, refresh: () => setRevision(value => value + 1) };
}
