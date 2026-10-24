import type { Metadata } from "next";
import Link from "next/link";
import { FilterChips, PageHeader, StatusPill } from "@/components/wireframe";
import { DEMO_ORDER_ID, DEMO_STORE } from "@/lib/demo";

export const metadata: Metadata = { title: "My orders" };

const orders: [string, "neutral" | "warning" | "success" | "danger"][] = [
  ["Placed", "warning"],
  ["Out for delivery", "neutral"],
  ["Delivered", "success"],
  ["Cancelled", "danger"],
];

export default function MyOrdersPage() {
  return (
    <>
      <PageHeader title="My orders" />
      <div className="mb-4">
        <FilterChips chips={["All", "Active", "Delivered", "Cancelled"]} />
      </div>
      <ul className="space-y-3">
        {orders.map(([status, tone], i) => (
          <li key={i}>
            <Link
              href={`/shop/${DEMO_STORE.slug}/orders/${DEMO_ORDER_ID}`}
              className="flex items-center gap-4 rounded-md border border-hairline p-4 hover:bg-surface-soft"
            >
              <span className="size-12 shrink-0 rounded-md bg-surface-card" />
              <div className="flex-1 space-y-2">
                <span className="block text-body-sm font-bold text-ink">Order #—</span>
                <span className="block h-3 w-32 rounded-full bg-secondary-bg" />
              </div>
              <StatusPill tone={tone}>{status}</StatusPill>
              <span className="hidden w-16 text-right text-body-sm font-bold text-ink sm:block">₹ —</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
