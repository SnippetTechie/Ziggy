import type { Metadata } from "next";
import { Card, FilterChips, PageHeader, Placeholder } from "@/components/wireframe";

export const metadata: Metadata = { title: "Reports" };

const reports = [
  ["Stock summary", "On-hand quantity and value by product and location"],
  ["Inventory valuation", "Weighted-average cost valuation at a point in time"],
  ["Movement history", "Every receipt, sale, issue, adjustment, and transfer"],
  ["Low stock", "Products at or below their reorder point"],
  ["Purchasing summary", "Orders, receipts, and outstanding quantities by supplier"],
  ["Fast & slow movers", "Products ranked by sales velocity"],
];

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Reports"
        description="Every report reconciles with the underlying stock movements and balances."
        secondaryAction="Export CSV"
      />
      <div className="mb-6">
        <FilterChips chips={["Last 30 days", "This month", "Last quarter", "Custom range"]} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map(([title, hint]) => (
          <Card key={title} title={title} action="Open">
            <Placeholder label="Report preview" hint={hint} height="h-32" />
          </Card>
        ))}
      </div>
    </>
  );
}
