"use client";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "./store";

/** Header cart button with an item-count badge. Rendered for the USER role only. */
export function CartLink() {
  const { count } = useCart();
  return <Link href="/cart" aria-label={count ? `Cart, ${count} ${count === 1 ? "item" : "items"}` : "Cart, empty"} className="relative grid size-11 place-items-center rounded-md hover:bg-surface-card"><ShoppingCart className="size-5" aria-hidden />{count > 0 && <span aria-hidden className="absolute right-0.5 top-0.5 min-w-5 rounded-full bg-primary px-1 text-center text-caption font-bold leading-5 text-on-primary">{count > 99 ? "99+" : count}</span>}</Link>;
}
