import { requirePageRole } from "@/server/authorization/session";
import type { Metadata } from "next";
import {
  Button,
  Card,
  FilterChips,
  PageHeader,
  Placeholder,
  StatTile,
  WireTable,
} from "@/components/wireframe";

export const metadata: Metadata = { title: "Ziggy Intelligence" };

/** Doc 06: advisory forecasts, stock-out risk, and reorder recommendations. */
export default async function IntelligencePage() {
  await requirePageRole("ADMIN");
  return (
    <>
      <PageHeader
        title="Ziggy Intelligence"
        description="Demand forecasts, stock-out risk, and reorder suggestions based on your own sales history. Suggestions never change stock on their own."
      />

      <div className="mb-6 rounded-md border border-hairline bg-canvas p-4 text-body-sm text-body">
        <span className="font-bold text-ink">Data used: </span>
        posted sales from the last 90 days · generated at — · products with under 4 weeks of history
        use simple rule-based guidance.
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="High stock-out risk" tone="danger" hint="Within supplier lead time" />
        <StatTile label="Reorder suggested" tone="warning" />
        <StatTile label="Insufficient history" hint="Rule-based guidance only" />
      </div>

      <div className="mt-6 mb-4">
        <FilterChips chips={["Reorder recommendations", "Stock-out risk", "Demand forecast"]} />
      </div>

      <WireTable
        columns={["Product", "Location", "Confidence", "On hand", "Days of cover", "Lead time", "Suggested qty"]}
        numericFrom={3}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Why this suggestion?">
          <Placeholder
            label="Recommendation explanation"
            hint="Evidence, assumptions, data period, and limitations"
            height="h-44"
          />
          <div className="mt-4 flex gap-2">
            <Button>Create draft PO</Button>
            <Button variant="secondary">Dismiss</Button>
          </div>
        </Card>
        <Card title="Demand history & forecast">
          <Placeholder label="Chart: actual vs. forecast demand" hint="Stock-out periods marked" height="h-60" />
        </Card>
      </div>
    </>
  );
}
