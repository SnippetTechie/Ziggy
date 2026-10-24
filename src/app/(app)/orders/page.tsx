import type { Metadata } from "next";
import Link from "next/link";
import { FilterChips, PageHeader, StatTile, StatusPill } from "@/components/wireframe";
import { DEMO_ORDER_ID } from "@/lib/demo";

export const metadata: Metadata = { title: "Customer orders" };

const rows: [string, "warning" | "neutral" | "success" | "danger"][] = [
  ["Placed", "warning"],
  ["Placed", "warning"],
  ["Confirmed", "neutral"],
  ["Packed", "neutral"],
  ["Out for delivery", "neutral"],
  ["Delivered", "success"],
  ["Cancelled", "danger"],
];

/** Orders placed by shoppers on the storefront (/shop/[store]). */
export default function CustomerOrdersPage() {
  return (
    <>
      <PageHeader
        title="Customer orders"
        description="Orders from your online shop. Confirm, pack, and fulfil them; stock is deducted when an order is fulfilled."
        secondaryAction="Shop settings"
      />
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile label="New — needs confirmation" tone="warning" />
        <StatTile label="To pack" />
        <StatTile label="Out for delivery" />
        <StatTile label="Delivered today" tone="success" />
      </div>
      <div className="mb-4">
        <FilterChips chips={["All", "Placed", "Confirmed", "Packed", "Out for delivery", "Delivered", "Cancelled"]} />
      </div>
      <div className="overflow-x-auto rounded-md border border-hairline bg-canvas">
        <table className="w-full min-w-[720px] text-left text-body-sm">
          <thead className="border-b border-hairline bg-surface-soft">
            <tr>
              {["Order #", "Customer", "Fulfilment", "Placed", "Status", "Items", "Total", ""].map((c) => (
                <th key={c} scope="col" className="px-4 py-3 font-bold text-ink">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([status, tone], i) => (
              <tr key={i} className="border-b border-hairline-soft last:border-0">
                <td className="px-4 py-3.5 font-bold text-ink">#—</td>
                {[28, 20, 16].map((w, j) => (
                  <td key={j} className="px-4 py-3.5">
                    <span className="block h-3 rounded-full bg-secondary-bg" style={{ width: w * 4 }} />
                  </td>
                ))}
                <td className="px-4 py-3.5">
                  <StatusPill tone={tone}>{status}</StatusPill>
                </td>
                <td className="px-4 py-3.5 text-right">—</td>
                <td className="px-4 py-3.5 text-right font-bold">₹ —</td>
                <td className="px-4 py-3.5 text-right">
                  <Link href={`/orders/${DEMO_ORDER_ID}`} className="font-bold text-ink-soft underline">
                    {status === "Placed" ? "Review" : "View"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
