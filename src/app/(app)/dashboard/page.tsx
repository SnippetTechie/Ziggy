import type { Metadata } from "next";
import {
  Button,
  Card,
  PageHeader,
  Placeholder,
  StatTile,
  StatusPill,
  WireTable,
} from "@/components/wireframe";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Answers the five questions from doc 04 §1:
 * what stock do I have, what is running low, what is moving,
 * what do I need to buy, and what needs attention today.
 */
export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Good morning"
        description="Here's what needs your attention across all locations today."
        secondaryAction="Receive goods"
        primaryAction="Record sale"
      />

      {/* What stock do I have / what is running low */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Inventory value" hint="Weighted-average cost" />
        <StatTile label="Low-stock items" tone="warning" hint="Below reorder point" />
        <StatTile label="Out of stock" tone="danger" hint="Across all locations" />
        <StatTile label="Open purchase orders" hint="Awaiting receipt" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* What should I pay attention to today */}
        <Card title="Needs attention today" className="xl:col-span-2">
          <ul className="divide-y divide-hairline-soft">
            {[
              ["warning", "Low stock", "Product below reorder point at a location"],
              ["danger", "Out of stock", "Product with zero on-hand at a branch"],
              ["neutral", "Receipt pending", "Purchase order expected today"],
              ["neutral", "Transfer draft", "Unposted transfer between locations"],
            ].map(([tone, pill, text]) => (
              <li key={pill} className="flex items-center gap-3 py-3">
                <StatusPill tone={tone as "warning" | "danger" | "neutral"}>{pill}</StatusPill>
                <span className="text-body-sm text-body">{text}</span>
                <span className="ml-auto block h-3 w-20 rounded-full bg-secondary-bg" />
              </li>
            ))}
          </ul>
        </Card>

        {/* What do I need to purchase */}
        <Card title="Suggested reorders" action="View all">
          <Placeholder
            label="Ziggy Intelligence"
            hint="Reorder suggestions with data period, assumptions, and confidence. Advisory only."
            height="h-48"
          />
          <div className="mt-4">
            <Button variant="secondary">Create draft PO</Button>
          </div>
        </Card>
      </div>

      {/* What stock is moving in and out */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Running low" action="Inventory">
          <WireTable columns={["Product", "Location", "On hand", "Reorder at"]} numericFrom={2} rows={5} />
        </Card>
        <Card title="Recent stock movements" action="Movement history">
          <WireTable columns={["Time", "Type", "Product", "Qty"]} numericFrom={3} rows={5} />
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Stock movement trend">
          <Placeholder label="Chart: stock in vs. out" hint="Last 30 days, by location" height="h-56" />
        </Card>
      </div>
    </>
  );
}
